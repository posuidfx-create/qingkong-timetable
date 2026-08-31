import { normalizeMimeType, sanitizeAttachmentName } from "@/lib/chatMedia"
import type {
  LearningAsset,
  LearningAssetDraft,
  LearningAssetInsertRow,
  LearningAssetType,
  LearningRecord,
  LearningRecordDraft,
  LearningRecordInsertRow,
  LearningRecordType,
} from "@/types/learning"
import { LEARNING_ASSET_TYPES, LEARNING_PROCESSING_STATUSES, LEARNING_RECORD_TYPES } from "@/types/learning"
import type { Profile } from "@/types/auth"

export const LEARNING_MATERIALS_BUCKETS: Readonly<Record<LearningAssetType, string>> = {
  image: "learning-materials-images",
  document: "learning-materials-documents",
  audio: "learning-materials-audio",
}
export const LEARNING_MATERIALS_BUCKET_IDS = [
  LEARNING_MATERIALS_BUCKETS.image,
  LEARNING_MATERIALS_BUCKETS.document,
  LEARNING_MATERIALS_BUCKETS.audio,
] as const
export const MAX_LEARNING_ASSETS = 20
export const LEARNING_ASSET_LIMITS = {
  image: 15 * 1024 * 1024,
  document: 25 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
} as const

export type LearningValidationErrorCode =
  | "unsupported_type"
  | "empty_file"
  | "image_too_large"
  | "document_too_large"
  | "audio_too_large"
  | "too_many_assets"
  | "invalid_date"
  | "content_required"
  | "course_required"
  | "invalid_record"

export class LearningValidationError extends Error {
  constructor(public readonly code: LearningValidationErrorCode) {
    super(code)
  }
}

const imageMimes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])
const documentMimes = new Set([
  "application/pdf", "text/plain", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
])
const audioMimes = new Set(["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg"])
const mimeByExtension: Readonly<Record<string, string>> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif",
  pdf: "application/pdf", txt: "text/plain", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", webm: "audio/webm", ogg: "audio/ogg",
}
const extensionByMime: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif",
  "application/pdf": "pdf", "text/plain": "txt", "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx", "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx", "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx", "audio/mpeg": "mp3",
  "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/wav": "wav", "audio/x-wav": "wav", "audio/webm": "webm", "audio/ogg": "ogg",
}

function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? ""
}

function optionalTrimmed(value: string): string | null {
  const normalized = value.trim()
  return normalized || null
}

export function isLearningRecordType(value: unknown): value is LearningRecordType {
  return typeof value === "string" && LEARNING_RECORD_TYPES.includes(value as LearningRecordType)
}

export function isLearningAssetType(value: unknown): value is LearningAssetType {
  return typeof value === "string" && LEARNING_ASSET_TYPES.includes(value as LearningAssetType)
}

export function createLearningAssetDraft(file: File): LearningAssetDraft {
  const extension = extensionOf(file.name)
  const mime = normalizeMimeType(file.type) || mimeByExtension[extension]
  const type = imageMimes.has(mime) ? "image" : documentMimes.has(mime) ? "document" : audioMimes.has(mime) ? "audio" : null
  if (!type || !extensionByMime[mime] || (extension && mimeByExtension[extension] !== mime)) throw new LearningValidationError("unsupported_type")
  if (!Number.isFinite(file.size) || file.size <= 0) throw new LearningValidationError("empty_file")
  if (file.size > LEARNING_ASSET_LIMITS[type]) throw new LearningValidationError(`${type}_too_large`)
  return { file, type, name: sanitizeAttachmentName(file.name), mime, size: file.size }
}

export function appendLearningAssetDrafts(existingCount: number, files: Iterable<File>): LearningAssetDraft[] {
  const next = [...files].map(createLearningAssetDraft)
  if (existingCount + next.length > MAX_LEARNING_ASSETS) throw new LearningValidationError("too_many_assets")
  return next
}

export function createLearningAssetPath(userId: string, recordId: string, draft: Pick<LearningAssetDraft, "name" | "mime">, objectId: string): string {
  if (!userId || !recordId || !objectId) throw new LearningValidationError("invalid_record")
  const extension = mimeByExtension[extensionOf(draft.name)] === draft.mime ? extensionOf(draft.name) : extensionByMime[draft.mime]
  if (!extension) throw new LearningValidationError("unsupported_type")
  return `learning/${userId}/${recordId}/${objectId}.${extension}`
}

export function getLearningMaterialsBucket(type: LearningAssetType): string {
  return LEARNING_MATERIALS_BUCKETS[type]
}

export function validateLearningRecordDraft(draft: LearningRecordDraft, assetCount = 0): LearningRecordDraft {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.recordDate)) throw new LearningValidationError("invalid_date")
  if (draft.type === "class" && !draft.courseName.trim()) throw new LearningValidationError("course_required")
  if (!draft.title.trim() && !draft.content.trim() && !draft.moodNote.trim() && assetCount < 1) throw new LearningValidationError("content_required")
  return draft
}

export function buildLearningRecordInsertRow(draft: LearningRecordDraft, userId: string, recordId: string, assetCount = 0): LearningRecordInsertRow {
  validateLearningRecordDraft(draft, assetCount)
  if (!userId || !recordId) throw new LearningValidationError("invalid_record")
  return {
    id: recordId,
    user_id: userId,
    record_date: draft.recordDate,
    title: optionalTrimmed(draft.title),
    course_name: draft.type === "class" ? optionalTrimmed(draft.courseName) : null,
    course_key: draft.type === "class" ? optionalTrimmed(draft.courseKey) : null,
    record_type: draft.type,
    content: optionalTrimmed(draft.content),
    mood_note: optionalTrimmed(draft.moodNote),
  }
}

export function buildLearningAssetInsertRow(recordId: string, userId: string, path: string, draft: LearningAssetDraft, id: string, sortOrder: number): LearningAssetInsertRow {
  if (!path.startsWith(`learning/${userId}/${recordId}/`)) throw new LearningValidationError("invalid_record")
  return { id, record_id: recordId, user_id: userId, asset_type: draft.type, original_name: draft.name, mime_type: draft.mime, file_size: draft.size, storage_bucket: getLearningMaterialsBucket(draft.type), storage_path: path, sort_order: sortOrder }
}

export function getCourseRecordCounts(records: readonly LearningRecord[]): Array<{ courseName: string; count: number }> {
  const counts = new Map<string, number>()
  for (const record of records) if (record.courseName) counts.set(record.courseName, (counts.get(record.courseName) ?? 0) + 1)
  return [...counts.entries()].map(([courseName, count]) => ({ courseName, count })).sort((left, right) => right.count - left.count || left.courseName.localeCompare(right.courseName))
}

export function sortLearningRecords(records: readonly LearningRecord[]): LearningRecord[] {
  return [...records].sort((left, right) => right.recordDate.localeCompare(left.recordDate) || right.createdAt.localeCompare(left.createdAt))
}

export function isLearningProcessingStatus(value: unknown): value is LearningAsset["processingStatus"] {
  return typeof value === "string" && LEARNING_PROCESSING_STATUSES.includes(value as LearningAsset["processingStatus"])
}

export function canUsePersonalLearning(profile: Pick<Profile, "identityType"> | null): boolean {
  return profile !== null
}
