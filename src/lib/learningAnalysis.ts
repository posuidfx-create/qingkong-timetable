import { LEARNING_AI_ENABLED } from "@/constants/features"
import { isLearningAssetAiSupported } from "@/lib/learningAiSupport"
import { fetchLearningRecordById } from "@/lib/learningService"
import { supabase } from "@/lib/supabase"
import type { LearningAsset, LearningRecord } from "@/types/learning"

export const LEARNING_ANALYSIS_FUNCTION_NAME = "analyze-learning-record"

export { isLearningAssetAiSupported } from "@/lib/learningAiSupport"

export type LearningAnalysisAction = "analyze" | "processing" | "rerun" | null
export type LearningAnalysisErrorCode = "not_configured" | "auth_required" | "record_not_found" | "forbidden" | "deepseek_not_configured" | "deepseek_auth_failed" | "deepseek_quota" | "deepseek_timeout" | "invalid_ai_response" | "network_failed" | "analysis_failed"

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

function hasRecordText(record: Pick<LearningRecord, "title" | "courseName" | "content" | "moodNote">): boolean {
  return [record.title, record.courseName, record.content, record.moodNote].some((value) => Boolean(value?.trim()))
}

type LearningAnalysisSubject = readonly LearningAsset[] | Pick<LearningRecord, "title" | "courseName" | "content" | "moodNote" | "processingStatus" | "assets">

function isAssetList(subject: LearningAnalysisSubject): subject is readonly LearningAsset[] {
  return Array.isArray(subject)
}

export function getLearningAnalysisAction(subject: LearningAnalysisSubject, running = false): LearningAnalysisAction {
  const assets = isAssetList(subject) ? subject : subject.assets
  const supported = assets.filter(isLearningAssetAiSupported)
  const supportsText = !isAssetList(subject) && hasRecordText(subject)
  if (!supported.length && !supportsText) return null
  if (running || (!isAssetList(subject) && subject.processingStatus === "processing") || supported.some((asset) => asset.processingStatus === "processing")) return "processing"
  return (!isAssetList(subject) && ["completed", "failed"].includes(subject.processingStatus)) || supported.some((asset) => asset.processingStatus === "completed" || asset.processingStatus === "failed") ? "rerun" : "analyze"
}

export function markLearningAssetsProcessing(record: LearningRecord): LearningRecord {
  return { ...record, processingStatus: hasRecordText(record) ? "processing" : record.processingStatus, assets: record.assets.map((asset) => isLearningAssetAiSupported(asset) ? { ...asset, processingStatus: "processing" as const } : asset) }
}

export function buildLearningAnalysisRequest(recordId: string): { recordId: string } {
  return { recordId }
}

export function mapLearningAnalysisError(status: number | null, serverCode?: string | null): LearningAnalysisErrorCode {
  if (status === 401 || serverCode === "auth_required") return "auth_required"
  if (status === 403 || serverCode === "forbidden") return "forbidden"
  if (status === 404 || serverCode === "record_not_found") return "record_not_found"
  if (serverCode === "deepseek_not_configured" || serverCode === "backend_not_configured") return "deepseek_not_configured"
  if (serverCode === "deepseek_auth_failed") return "deepseek_auth_failed"
  if (serverCode === "deepseek_quota") return "deepseek_quota"
  if (serverCode === "deepseek_timeout") return "deepseek_timeout"
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
