import { getAuthErrorMessage } from "@/lib/auth"
import {
  buildLearningAssetInsertRow,
  buildLearningRecordInsertRow,
  createLearningAssetDraft,
  createLearningAssetPath,
  getLearningMaterialsBucket,
  isLearningAssetType,
  isLearningProcessingStatus,
  isLearningRecordType,
  LEARNING_MATERIALS_BUCKET_IDS,
  MAX_LEARNING_ASSETS,
} from "@/lib/learningRecords"
import { supabase } from "@/lib/supabase"
import type { LearningAsset, LearningAssetAnalysis, LearningAssetDraft, LearningAssetInsertRow, LearningRecord, LearningRecordDraft } from "@/types/learning"

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()
const recordColumns = "id, user_id, record_date, title, course_name, course_key, record_type, content, mood_note, processing_status, analysis_json, created_at, updated_at"
const assetColumns = "id, record_id, user_id, asset_type, original_name, mime_type, file_size, storage_bucket, storage_path, sort_order, processing_status, extracted_text, analysis_json, created_at"

export type LearningServiceErrorCode = "not_configured" | "auth_required" | "record_save_failed" | "asset_upload_failed" | "asset_save_failed" | "asset_delete_failed" | "record_delete_failed" | "record_load_failed"
export class LearningServiceError extends Error {
  constructor(public readonly code: LearningServiceErrorCode, public readonly cause?: unknown) { super(code) }
}

function requireSupabase() {
  if (!supabase) throw new LearningServiceError("not_configured")
  return supabase
}

function optionalString(value: unknown): string | null | undefined {
  return value === null ? null : typeof value === "string" ? value : undefined
}

export function parseLearningAsset(value: unknown): LearningAsset | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== "string" || typeof row.record_id !== "string" || typeof row.user_id !== "string" || !isLearningAssetType(row.asset_type) || typeof row.original_name !== "string" || typeof row.mime_type !== "string" || typeof row.file_size !== "number" || typeof row.storage_bucket !== "string" || typeof row.storage_path !== "string" || typeof row.sort_order !== "number" || !isLearningProcessingStatus(row.processing_status) || typeof row.created_at !== "string") return null
  const extractedText = row.extracted_text === undefined || row.extracted_text === null ? null : typeof row.extracted_text === "string" ? row.extracted_text : undefined
  const analysis = row.analysis_json === undefined || row.analysis_json === null ? null : parseLearningAssetAnalysis(row.analysis_json)
  if (extractedText === undefined || (row.analysis_json !== undefined && row.analysis_json !== null && !analysis)) return null
  return { id: row.id, recordId: row.record_id, userId: row.user_id, type: row.asset_type, originalName: row.original_name, mimeType: row.mime_type, fileSize: row.file_size, storageBucket: row.storage_bucket, storagePath: row.storage_path, sortOrder: row.sort_order, processingStatus: row.processing_status, extractedText, analysis, createdAt: row.created_at }
}

export function parseLearningAssetAnalysis(value: unknown): LearningAssetAnalysis | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (row.version !== 1 || typeof row.summary !== "string" || !Array.isArray(row.keyPoints) || !row.keyPoints.every((item) => typeof item === "string") || typeof row.contentType !== "string" || typeof row.language !== "string" || typeof row.suggestedReview !== "string" || !Array.isArray(row.warnings) || !row.warnings.every((item) => typeof item === "string")) return null
  return { version: 1, summary: row.summary, keyPoints: row.keyPoints, contentType: row.contentType, language: row.language, suggestedReview: row.suggestedReview, warnings: row.warnings }
}

export function parseLearningRecord(value: unknown, assets: readonly LearningAsset[] = []): LearningRecord | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const title = optionalString(row.title); const courseName = optionalString(row.course_name); const courseKey = optionalString(row.course_key); const content = optionalString(row.content); const moodNote = optionalString(row.mood_note)
  const analysis = row.analysis_json === undefined || row.analysis_json === null ? null : parseLearningAssetAnalysis(row.analysis_json)
  if (typeof row.id !== "string" || typeof row.user_id !== "string" || typeof row.record_date !== "string" || !isLearningRecordType(row.record_type) || title === undefined || courseName === undefined || courseKey === undefined || content === undefined || moodNote === undefined || !isLearningProcessingStatus(row.processing_status) || (row.analysis_json !== undefined && row.analysis_json !== null && !analysis) || typeof row.created_at !== "string" || typeof row.updated_at !== "string") return null
  return { id: row.id, userId: row.user_id, recordDate: row.record_date, title, courseName, courseKey, type: row.record_type, content, moodNote, processingStatus: row.processing_status, analysis, createdAt: row.created_at, updatedAt: row.updated_at, assets: assets.filter((asset) => asset.recordId === row.id).sort((left, right) => left.sortOrder - right.sortOrder) }
}

async function getAuthUserId(): Promise<string> {
  const { data, error } = await requireSupabase().auth.getUser()
  if (error || !data.user?.id) throw new LearningServiceError("auth_required", error)
  return data.user.id
}

export interface LearningStorageObject { bucket: string; path: string }

export type LearningStoragePageLoader = (bucket: string, prefix: string, offset: number, limit: number) => Promise<readonly string[]>

export async function listLearningRecordStorageObjects(
  userId: string,
  recordId: string,
  loadPage: LearningStoragePageLoader,
): Promise<LearningStorageObject[]> {
  const prefix = `learning/${userId}/${recordId}`
  const limit = 100
  const objects: LearningStorageObject[] = []
  for (const bucket of LEARNING_MATERIALS_BUCKET_IDS) {
    let offset = 0
    while (true) {
      const names = await loadPage(bucket, prefix, offset, limit)
      objects.push(...names.filter(Boolean).map((name) => ({ bucket, path: `${prefix}/${name}` })))
      if (names.length < limit) break
      offset += names.length
    }
  }
  return objects
}

async function removeStorageObjects(objects: readonly LearningStorageObject[]): Promise<void> {
  const groups = new Map<string, string[]>()
  for (const object of objects) groups.set(object.bucket, [...(groups.get(object.bucket) ?? []), object.path])
  for (const [bucket, paths] of groups) {
    const { error } = await requireSupabase().storage.from(bucket).remove(paths)
    if (error) throw new LearningServiceError("asset_delete_failed", error)
  }
}

export async function fetchLearningRecords(): Promise<LearningRecord[]> {
  const client = requireSupabase()
  const { data: records, error } = await client.from("learning_records").select(recordColumns).order("record_date", { ascending: false }).order("created_at", { ascending: false })
  if (error) throw new LearningServiceError("record_load_failed", error)
  const ids = (records ?? []).map((row) => row.id).filter((id): id is string => typeof id === "string")
  let assets: LearningAsset[] = []
  if (ids.length) {
    const { data: assetRows, error: assetError } = await client.from("learning_assets").select(assetColumns).in("record_id", ids).order("sort_order")
    if (assetError) throw new LearningServiceError("record_load_failed", assetError)
    assets = (assetRows ?? []).map(parseLearningAsset).filter((item): item is LearningAsset => item !== null)
  }
  return (records ?? []).map((row) => parseLearningRecord(row, assets)).filter((item): item is LearningRecord => item !== null)
}

export async function fetchLearningRecordById(id: string): Promise<LearningRecord> {
  const records = await fetchLearningRecords()
  const record = records.find((item) => item.id === id)
  if (!record) throw new LearningServiceError("record_load_failed")
  return record
}

interface UploadedAsset { draft: LearningAssetDraft; bucket: string; path: string; id: string; sortOrder: number }

async function uploadLearningAssets(recordId: string, userId: string, files: readonly File[], startOrder: number): Promise<UploadedAsset[]> {
  const client = requireSupabase()
  const uploaded: UploadedAsset[] = []
  try {
    for (const [index, file] of files.entries()) {
      const draft = createLearningAssetDraft(file)
      const id = crypto.randomUUID()
      const path = createLearningAssetPath(userId, recordId, draft, crypto.randomUUID())
      const bucket = getLearningMaterialsBucket(draft.type)
      const { error } = await client.storage.from(bucket).upload(path, file, { contentType: draft.mime, upsert: false })
      if (error) throw new LearningServiceError("asset_upload_failed", error)
      uploaded.push({ draft, bucket, path, id, sortOrder: startOrder + index })
    }
    return uploaded
  } catch (reason) {
    if (uploaded.length) await removeStorageObjects(uploaded.map((item) => ({ bucket: item.bucket, path: item.path }))).catch(() => undefined)
    throw reason
  }
}

async function insertAssetMetadata(recordId: string, userId: string, uploaded: readonly UploadedAsset[]): Promise<LearningAssetInsertRow[]> {
  if (!uploaded.length) return []
  const rows = uploaded.map((item) => buildLearningAssetInsertRow(recordId, userId, item.path, item.draft, item.id, item.sortOrder))
  const { error } = await requireSupabase().from("learning_assets").insert(rows)
  if (error) throw new LearningServiceError("asset_save_failed", error)
  return rows
}

export interface LearningCreateFlow<T> {
  insertRecord: () => Promise<void>
  uploadAssets: () => Promise<readonly LearningStorageObject[]>
  insertMetadata: () => Promise<void>
  selectRecord: () => Promise<T>
  cleanupStorage: (objects: readonly LearningStorageObject[]) => Promise<void>
  rollbackRecord: () => Promise<void>
}

export interface LearningDeleteFlow {
  getStorageObjects: () => Promise<readonly LearningStorageObject[]>
  deleteStorage: (objects: readonly LearningStorageObject[]) => Promise<void>
  deleteDatabase: () => Promise<void>
}

export async function runLearningDeleteFlow(flow: LearningDeleteFlow): Promise<void> {
  const objects = await flow.getStorageObjects()
  if (objects.length) await flow.deleteStorage(objects)
  await flow.deleteDatabase()
}

export async function runLearningCreateFlow<T>(flow: LearningCreateFlow<T>): Promise<T> {
  let recordCreated = false
  let uploadedObjects: readonly LearningStorageObject[] = []
  try {
    await flow.insertRecord(); recordCreated = true
    uploadedObjects = await flow.uploadAssets()
    await flow.insertMetadata()
    return await flow.selectRecord()
  } catch (reason) {
    if (uploadedObjects.length) await flow.cleanupStorage(uploadedObjects).catch(() => undefined)
    if (recordCreated) await flow.rollbackRecord().catch(() => undefined)
    throw reason
  }
}

export async function createLearningRecord(draft: LearningRecordDraft, files: readonly File[]): Promise<LearningRecord> {
  if (files.length > MAX_LEARNING_ASSETS) throw new LearningServiceError("asset_save_failed")
  const client = requireSupabase(); const userId = await getAuthUserId(); const recordId = crypto.randomUUID()
  const row = buildLearningRecordInsertRow(draft, userId, recordId, files.length)
  let uploaded: UploadedAsset[] = []
  return runLearningCreateFlow({
    insertRecord: async () => { const { error } = await client.from("learning_records").insert(row); if (error) throw new LearningServiceError("record_save_failed", error) },
    uploadAssets: async () => { uploaded = await uploadLearningAssets(recordId, userId, files, 0); return uploaded.map((item) => ({ bucket: item.bucket, path: item.path })) },
    insertMetadata: async () => { await insertAssetMetadata(recordId, userId, uploaded) },
    selectRecord: () => fetchLearningRecordById(recordId),
    cleanupStorage: removeStorageObjects,
    rollbackRecord: async () => { await client.from("learning_records").delete().eq("id", recordId) },
  })
}

export async function updateLearningRecord(record: LearningRecord, draft: LearningRecordDraft, newFiles: readonly File[], removedAssetIds: readonly string[]): Promise<LearningRecord> {
  const client = requireSupabase(); const userId = await getAuthUserId()
  if (record.userId !== userId) throw new LearningServiceError("record_save_failed")
  const existingAfterRemoval = record.assets.filter((asset) => !removedAssetIds.includes(asset.id))
  if (existingAfterRemoval.length + newFiles.length > MAX_LEARNING_ASSETS) throw new LearningServiceError("asset_save_failed")
  const insertRow = buildLearningRecordInsertRow(draft, userId, record.id, existingAfterRemoval.length + newFiles.length)
  const { id: _id, user_id: _userId, ...updateRow } = insertRow
  void _id; void _userId
  const { error: updateError } = await client.from("learning_records").update(updateRow).eq("id", record.id)
  if (updateError) throw new LearningServiceError("record_save_failed", updateError)
  const removed = record.assets.filter((asset) => removedAssetIds.includes(asset.id))
  if (removed.length) {
    await runLearningDeleteFlow({
      getStorageObjects: async () => removed.map((asset) => ({ bucket: asset.storageBucket, path: asset.storagePath })),
      deleteStorage: removeStorageObjects,
      deleteDatabase: async () => { const { error } = await client.from("learning_assets").delete().in("id", removed.map((asset) => asset.id)); if (error) throw new LearningServiceError("asset_delete_failed", error) },
    })
  }
  const uploaded = await uploadLearningAssets(record.id, userId, newFiles, existingAfterRemoval.length)
  try { await insertAssetMetadata(record.id, userId, uploaded) }
  catch (reason) { await removeStorageObjects(uploaded.map((item) => ({ bucket: item.bucket, path: item.path }))).catch(() => undefined); throw reason }
  return fetchLearningRecordById(record.id)
}

export async function deleteLearningRecord(record: LearningRecord): Promise<void> {
  const client = requireSupabase(); const userId = await getAuthUserId()
  if (record.userId !== userId) throw new LearningServiceError("record_delete_failed")
  await runLearningDeleteFlow({
    getStorageObjects: () => listLearningRecordStorageObjects(userId, record.id, async (bucket, prefix, offset, limit) => {
      const { data, error } = await client.storage.from(bucket).list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } })
      if (error) throw new LearningServiceError("asset_delete_failed", error)
      return (data ?? []).flatMap((item) => typeof item.name === "string" && item.name ? [item.name] : [])
    }),
    deleteStorage: removeStorageObjects,
    deleteDatabase: async () => { const { error } = await client.from("learning_records").delete().eq("id", record.id); if (error) throw new LearningServiceError("record_delete_failed", error) },
  })
}

export async function getLearningAssetUrl(asset: Pick<LearningAsset, "storageBucket" | "storagePath">): Promise<string> {
  const cacheKey = `${asset.storageBucket}:${asset.storagePath}`
  const cached = signedUrlCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.url
  const { data, error } = await requireSupabase().storage.from(asset.storageBucket).createSignedUrl(asset.storagePath, 60 * 60)
  if (error || !data?.signedUrl) throw new LearningServiceError("record_load_failed", error)
  signedUrlCache.set(cacheKey, { url: data.signedUrl, expiresAt: Date.now() + 55 * 60 * 1000 })
  return data.signedUrl
}

export function getLearningServiceErrorMessage(error: unknown): string {
  if (error instanceof LearningServiceError) return error.code
  return error instanceof Error ? getAuthErrorMessage(error.message) : "record_save_failed"
}
