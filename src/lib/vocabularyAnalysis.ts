import { LEARNING_AI_ENABLED } from "@/constants/features"
import { supabase } from "@/lib/supabase"
import { fetchVocabularyWordById } from "@/lib/vocabularyService"
import type { VocabularyWord } from "@/types/vocabulary"

export const VOCABULARY_ANALYSIS_FUNCTION_NAME = "analyze-vocabulary-word"

export type VocabularyAnalysisErrorCode = "not_configured" | "auth_required" | "word_not_found" | "forbidden" | "deepseek_not_configured" | "deepseek_auth_failed" | "deepseek_quota" | "deepseek_timeout" | "invalid_ai_response" | "network_failed" | "analysis_failed"

export class VocabularyAnalysisError extends Error {
  constructor(public readonly code: VocabularyAnalysisErrorCode, public readonly cause?: unknown) { super(code) }
}
export function buildVocabularyAnalysisRequest(wordId: string, force = false): { wordId: string; force?: true } {
  return force ? { wordId, force: true } : { wordId }
}

export function mapVocabularyAnalysisError(status: number | null, code?: string | null): VocabularyAnalysisErrorCode {
  if (status === 401 || code === "auth_required") return "auth_required"
  if (status === 403 || code === "forbidden") return "forbidden"
  if (status === 404 || code === "word_not_found") return "word_not_found"
  if (code === "deepseek_not_configured" || code === "backend_not_configured") return "deepseek_not_configured"
  if (code === "deepseek_auth_failed") return "deepseek_auth_failed"
  if (code === "deepseek_quota") return "deepseek_quota"
  if (code === "deepseek_timeout") return "deepseek_timeout"
  if (code === "invalid_ai_response") return "invalid_ai_response"
  if (status === null) return "network_failed"
  return "analysis_failed"
}

async function readError(error: unknown): Promise<{ status: number | null; code: string | null }> {
  if (!error || typeof error !== "object" || !("context" in error) || !((error as { context?: unknown }).context instanceof Response)) return { status: null, code: null }
  const response = (error as { context: Response }).context
  try {
    const body: unknown = await response.clone().json()
    return { status: response.status, code: body && typeof body === "object" && typeof (body as { code?: unknown }).code === "string" ? (body as { code: string }).code : null }
  } catch { return { status: response.status, code: null } }
}

export async function analyzeVocabularyWord(wordId: string, force = false): Promise<{ word: VocabularyWord; cached: boolean }> {
  if (!LEARNING_AI_ENABLED || !supabase) throw new VocabularyAnalysisError("not_configured")
  const { data, error } = await supabase.functions.invoke(VOCABULARY_ANALYSIS_FUNCTION_NAME, { body: buildVocabularyAnalysisRequest(wordId, force) })
  if (error) {
    const detail = await readError(error)
    throw new VocabularyAnalysisError(mapVocabularyAnalysisError(detail.status, detail.code), error)
  }
  if (!data || typeof data !== "object" || typeof (data as { cached?: unknown }).cached !== "boolean") throw new VocabularyAnalysisError("analysis_failed")
  return { word: await fetchVocabularyWordById(wordId), cached: (data as { cached: boolean }).cached }
}
