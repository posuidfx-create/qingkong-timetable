import { LEARNING_AI_ENABLED } from "@/constants/features"
import { fetchLearningRecordById } from "@/lib/learningService"
import { supabase } from "@/lib/supabase"
import type { LearningAsset, LearningRecord } from "@/types/learning"

export const LEARNING_ANALYSIS_FUNCTION_NAME = "analyze-learning-record"

const supportedImageMimes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])

export type LearningAnalysisAction = "analyze" | "processing" | "rerun" | null
export type LearningAnalysisErrorCode = "not_configured" | "auth_required" | "record_not_found" | "forbidden" | "gemini_not_configured" | "gemini_auth_failed" | "gemini_quota" | "gemini_timeout" | "invalid_ai_response" | "network_failed" | "analysis_failed"

export interface LearningAnalysisAssetResult {
  assetId: string
  status: "completed" | "failed" | "unsupported"
  errorCode?: string
}

export interface LearningAnalysisRunResult {
  record: LearningRecord
  results: LearningAnalysisAssetResult[]
  completed: number
  failed: number
  unsupported: number
}

export class LearningAnalysisError extends Error {
  constructor(public readonly code: LearningAnalysisErrorCode, public readonly cause?: unknown) { super(code) }
}

function normalizedMime(asset: Pick<LearningAsset, "mimeType">): string {
  return asset.mimeType.toLowerCase().split(";")[0]?.trim() ?? ""
}

export function isLearningAssetAiSupported(asset: Pick<LearningAsset, "type" | "mimeType">): boolean {
  const mime = normalizedMime(asset)
  return asset.type === "image" ? supportedImageMimes.has(mime) : asset.type === "document" && mime === "application/pdf"
}

export function getLearningAnalysisAction(assets: readonly LearningAsset[], running = false): LearningAnalysisAction {
  const supported = assets.filter(isLearningAssetAiSupported)
  if (!supported.length) return null
  if (running || supported.some((asset) => asset.processingStatus === "processing")) return "processing"
  return supported.some((asset) => asset.processingStatus === "completed" || asset.processingStatus === "failed") ? "rerun" : "analyze"
}

export function markLearningAssetsProcessing(record: LearningRecord): LearningRecord {
  return { ...record, assets: record.assets.map((asset) => isLearningAssetAiSupported(asset) ? { ...asset, processingStatus: "processing" as const } : asset) }
}

export function buildLearningAnalysisRequest(recordId: string): { recordId: string } {
  return { recordId }
}

export function mapLearningAnalysisError(status: number | null, serverCode?: string | null): LearningAnalysisErrorCode {
  if (status === 401 || serverCode === "auth_required") return "auth_required"
  if (status === 403 || serverCode === "forbidden") return "forbidden"
  if (status === 404 || serverCode === "record_not_found") return "record_not_found"
  if (serverCode === "gemini_not_configured" || serverCode === "backend_not_configured") return "gemini_not_configured"
  if (serverCode === "gemini_auth_failed") return "gemini_auth_failed"
  if (serverCode === "gemini_quota") return "gemini_quota"
  if (serverCode === "gemini_timeout") return "gemini_timeout"
  if (serverCode === "invalid_ai_response") return "invalid_ai_response"
  if (status === null) return "network_failed"
  return "analysis_failed"
}

async function readFunctionError(error: unknown): Promise<{ status: number | null; code: string | null }> {
  if (!error || typeof error !== "object") return { status: null, code: null }
  const context = "context" in error ? (error as { context?: unknown }).context : null
  if (!(context instanceof Response)) return { status: null, code: null }
  try {
    const body: unknown = await context.clone().json()
    const code = body && typeof body === "object" && typeof (body as { code?: unknown }).code === "string" ? (body as { code: string }).code : null
    return { status: context.status, code }
  } catch { return { status: context.status, code: null } }
}

function parseRunResponse(value: unknown): Omit<LearningAnalysisRunResult, "record"> | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (!Array.isArray(row.results) || typeof row.completed !== "number" || typeof row.failed !== "number" || typeof row.unsupported !== "number") return null
  const results = row.results.flatMap((item): LearningAnalysisAssetResult[] => {
    if (!item || typeof item !== "object") return []
    const result = item as Record<string, unknown>
    if (typeof result.assetId !== "string" || !["completed", "failed", "unsupported"].includes(String(result.status))) return []
    return [{ assetId: result.assetId, status: result.status as LearningAnalysisAssetResult["status"], errorCode: typeof result.errorCode === "string" ? result.errorCode : undefined }]
  })
  if (results.length !== row.results.length) return null
  return { results, completed: row.completed, failed: row.failed, unsupported: row.unsupported }
}

export async function analyzeLearningRecord(recordId: string): Promise<LearningAnalysisRunResult> {
  if (!LEARNING_AI_ENABLED) throw new LearningAnalysisError("not_configured")
  if (!supabase) throw new LearningAnalysisError("not_configured")
  const { data, error } = await supabase.functions.invoke(LEARNING_ANALYSIS_FUNCTION_NAME, { body: buildLearningAnalysisRequest(recordId) })
  if (error) {
    const detail = await readFunctionError(error)
    throw new LearningAnalysisError(mapLearningAnalysisError(detail.status, detail.code), error)
  }
  const parsed = parseRunResponse(data)
  if (!parsed) throw new LearningAnalysisError("analysis_failed")
  return { ...parsed, record: await fetchLearningRecordById(recordId) }
}
