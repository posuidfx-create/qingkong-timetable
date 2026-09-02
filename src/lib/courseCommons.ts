import { supabase } from "@/lib/supabase"
import { CONTRIBUTION_TYPES, type CourseCommonsAnalysis, type CourseContribution, type CourseContributionAsset, type CourseCommonsMetrics, type PublishContributionInput } from "@/types/courseCommons"

const assetColumns = "id, contribution_id, file_name, mime_type, file_size, storage_bucket, storage_path, created_at"
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

export type CourseCommonsErrorCode = "not_configured" | "auth_required" | "course_required" | "rights_required" | "load_failed" | "publish_failed" | "action_failed" | "analysis_failed"
export class CourseCommonsError extends Error { constructor(public readonly code: CourseCommonsErrorCode, public readonly cause?: unknown) { super(code) } }

function client() { if (!supabase) throw new CourseCommonsError("not_configured"); return supabase }
const optional = (value: unknown) => value === null ? null : typeof value === "string" ? value : undefined
const stringList = (value: unknown): string[] | null => Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null

export function parseContributionAsset(value: unknown): CourseContributionAsset | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (![row.id, row.contribution_id, row.file_name, row.mime_type, row.storage_bucket, row.storage_path, row.created_at].every((item) => typeof item === "string") || typeof row.file_size !== "number") return null
  return { id: row.id as string, contributionId: row.contribution_id as string, fileName: row.file_name as string, mimeType: row.mime_type as string, fileSize: row.file_size, storageBucket: row.storage_bucket as string, storagePath: row.storage_path as string, createdAt: row.created_at as string }
}

export function parseCourseContribution(value: unknown, assets: readonly CourseContributionAsset[] = []): CourseContribution | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>; const sourceRecordId = optional(row.source_record_id); const aiSummary = optional(row.ai_summary); const aiSuggestedReview = optional(row.ai_suggested_review); const points = stringList(row.ai_key_points)
  const bookmarkCount = typeof row.bookmark_count === "number" ? row.bookmark_count : typeof row.bookmark_count === "string" && /^\d+$/.test(row.bookmark_count) ? Number(row.bookmark_count) : null
  if (![row.id, row.author_id, row.author_name, row.course_key, row.course_name_snapshot, row.title, row.content, row.language, row.status, row.published_at, row.updated_at].every((item) => typeof item === "string") || !CONTRIBUTION_TYPES.includes(row.contribution_type as never) || sourceRecordId === undefined || aiSummary === undefined || aiSuggestedReview === undefined || !points || bookmarkCount === null || typeof row.bookmarked !== "boolean") return null
  return { id: row.id as string, authorId: row.author_id as string, authorName: row.author_name as string, courseKey: row.course_key as string, courseName: row.course_name_snapshot as string, sourceRecordId, title: row.title as string, content: row.content as string, type: row.contribution_type as CourseContribution["type"], language: row.language as string, status: row.status as CourseContribution["status"], aiSummary, aiKeyPoints: points, aiSuggestedReview, publishedAt: row.published_at as string, updatedAt: row.updated_at as string, bookmarkCount, bookmarked: row.bookmarked, assets: assets.filter((asset) => asset.contributionId === row.id) }
}

export function filterCourseContributions(items: readonly CourseContribution[], query: string, type: "all" | CourseContribution["type"] = "all"): CourseContribution[] {
  const needle = query.trim().toLocaleLowerCase()
  return items.filter((item) => type === "all" || item.type === type).filter((item) => !needle || [item.title, item.content, item.aiSummary, item.aiSuggestedReview, item.authorName, ...item.aiKeyPoints, ...item.assets.map((asset) => asset.fileName)].some((value) => value?.toLocaleLowerCase().includes(needle)))
}

export function getCourseCommonsMetrics(items: readonly CourseContribution[]): CourseCommonsMetrics { return { contributions: items.length, contributors: new Set(items.map((item) => item.authorId)).size } }
export function getDefaultCourseSharing(courseKey: string | null | undefined, existingRecord = false): boolean { return !existingRecord && Boolean(courseKey?.trim()) }
export function resolveSharedAssetIds(existingAssetIds: readonly string[], savedAssets: readonly { id: string; originalName: string; fileSize: number }[], sharedFiles: readonly File[]): string[] { return [...new Set([...existingAssetIds, ...savedAssets.filter((asset) => sharedFiles.some((file) => file.name === asset.originalName && file.size === asset.fileSize)).map((asset) => asset.id)])] }

export async function fetchCourseContributions(courseKey: string): Promise<CourseContribution[]> {
  if (!courseKey.trim()) return []
  const { data, error } = await client().rpc("get_course_contributions", { requested_course_key: courseKey })
  if (error) throw new CourseCommonsError("load_failed", error)
  const rows = Array.isArray(data) ? data : []; const ids = rows.map((row) => (row as { id?: unknown }).id).filter((id): id is string => typeof id === "string")
  let assets: CourseContributionAsset[] = []
  if (ids.length) { const result = await client().from("course_contribution_assets").select(assetColumns).in("contribution_id", ids); if (result.error) throw new CourseCommonsError("load_failed", result.error); assets = (result.data ?? []).map(parseContributionAsset).filter((item): item is CourseContributionAsset => Boolean(item)) }
  return rows.map((row) => parseCourseContribution(row, assets)).filter((item): item is CourseContribution => Boolean(item))
}

export async function publishLearningRecord(input: PublishContributionInput): Promise<CourseContribution> {
  if (input.sharedAssetIds.length && !input.confirmAssetRights) throw new CourseCommonsError("rights_required")
  const { data, error } = await client().functions.invoke("manage-course-contribution", { body: { action: "publish", ...input } })
  if (error || !data?.contribution) throw new CourseCommonsError("publish_failed", error)
  const assets = Array.isArray(data.assets) ? data.assets.map(parseContributionAsset).filter((item: CourseContributionAsset | null): item is CourseContributionAsset => Boolean(item)) : []
  const parsed = parseCourseContribution(data.contribution, assets); if (!parsed) throw new CourseCommonsError("publish_failed")
  return parsed
}

export async function unpublishContribution(id: string): Promise<void> { const { error } = await client().functions.invoke("manage-course-contribution", { body: { action: "unpublish", contributionId: id } }); if (error) throw new CourseCommonsError("action_failed", error) }
export async function resyncContribution(id: string, sharedAssetIds?: string[], confirmAssetRights = false): Promise<void> { if (sharedAssetIds?.length && !confirmAssetRights) throw new CourseCommonsError("rights_required"); const { error } = await client().functions.invoke("manage-course-contribution", { body: { action: "resync", contributionId: id, ...(sharedAssetIds ? { sharedAssetIds, confirmAssetRights } : {}) } }); if (error) throw new CourseCommonsError("action_failed", error) }
export async function updatePublishedContribution(id: string, title: string, content: string, type: CourseContribution["type"]): Promise<void> { const { error } = await client().rpc("edit_course_contribution", { p_contribution_id: id, new_title: title, new_content: content, new_type: type }); if (error) throw new CourseCommonsError("action_failed", error) }
export async function toggleContributionBookmark(id: string, bookmarked: boolean): Promise<void> { const { error } = await client().rpc("set_course_contribution_bookmark", { p_contribution_id: id, should_bookmark: !bookmarked }); if (error) throw new CourseCommonsError("action_failed", error) }
export async function quoteContributionToLearning(id: string): Promise<string> { const { data, error } = await client().rpc("quote_course_contribution", { p_contribution_id: id }); if (error || typeof data !== "string") throw new CourseCommonsError("action_failed", error); return data }
export async function reportContribution(id: string, reason: "inappropriate" | "copyright" | "spam" | "other", details = ""): Promise<void> { const { error } = await client().rpc("report_course_contribution", { p_contribution_id: id, report_reason: reason, report_details: details }); if (error) throw new CourseCommonsError("action_failed", error) }
export async function moderateContribution(id: string, action: "hide" | "restore"): Promise<void> { const { error } = await client().rpc("moderate_course_contribution", { p_contribution_id: id, moderation_action: action }); if (error) throw new CourseCommonsError("action_failed", error) }
export function isContributionPreviewImage(asset: CourseContributionAsset): boolean { return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(asset.mimeType.toLowerCase().split(";")[0].trim()) }
export async function getContributionAssetUrl(asset: CourseContributionAsset, forceRefresh = false): Promise<string> { const cacheKey = `${asset.storageBucket}:${asset.storagePath}`; const cached = signedUrlCache.get(cacheKey); if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.url; const { data, error } = await client().storage.from(asset.storageBucket).createSignedUrl(asset.storagePath, 60); if (error || !data.signedUrl) throw new CourseCommonsError("action_failed", error); signedUrlCache.set(cacheKey, { url: data.signedUrl, expiresAt: Date.now() + 45_000 }); return data.signedUrl }

export function parseCourseCommonsAnalysis(value: unknown): CourseCommonsAnalysis | null { if (!value || typeof value !== "object") return null; const row = value as Record<string, unknown>; const lists = [row.keyTopics, row.recurringDifficulties, row.recommendedReview, row.recentUpdates, row.sourceContributionIds]; if (row.version !== 1 || typeof row.courseSummary !== "string" || lists.some((list) => !stringList(list))) return null; return { version: 1, courseSummary: row.courseSummary, keyTopics: row.keyTopics as string[], recurringDifficulties: row.recurringDifficulties as string[], recommendedReview: row.recommendedReview as string[], recentUpdates: row.recentUpdates as string[], sourceContributionIds: row.sourceContributionIds as string[] } }
export async function analyzeCourseCommons(courseKey: string): Promise<{ analysis: CourseCommonsAnalysis; cached: boolean }> { const { data, error } = await client().functions.invoke("analyze-course-commons", { body: { courseKey } }); const analysis = parseCourseCommonsAnalysis(data?.analysis); if (error || !analysis) throw new CourseCommonsError("analysis_failed", error); return { analysis, cached: Boolean(data.cached) } }
