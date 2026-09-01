import { LEARNING_AI_ENABLED } from "@/constants/features"
import { fetchGrammarItemById } from "@/lib/grammarService"
import { parseVocabularyLessonAnalysis } from "@/lib/japaneseLessons"
import { supabase } from "@/lib/supabase"
import type { GrammarItem, VocabularyLessonAnalysis } from "@/types/vocabulary"

export const GRAMMAR_ANALYSIS_FUNCTION_NAME = "analyze-vocabulary-grammar"
export const LESSON_ANALYSIS_FUNCTION_NAME = "analyze-vocabulary-lesson"

export class JapaneseLessonAnalysisError extends Error {
  constructor(public readonly code: string, public readonly cause?: unknown) { super(code) }
}

async function invoke(functionName: string, body: Record<string, unknown>): Promise<{ cached: boolean }> {
  if (!LEARNING_AI_ENABLED || !supabase) throw new JapaneseLessonAnalysisError("not_configured")
  const { data, error } = await supabase.functions.invoke(functionName, { body })
  if (error) throw new JapaneseLessonAnalysisError("analysis_failed", error)
  if (!data || typeof data !== "object") throw new JapaneseLessonAnalysisError("analysis_failed")
  return { cached: (data as { cached?: unknown }).cached === true }
}

export async function analyzeGrammarItem(itemId: string, force = false): Promise<{ item: GrammarItem; cached: boolean }> {
  const result = await invoke(GRAMMAR_ANALYSIS_FUNCTION_NAME, force ? { itemId, force: true } : { itemId })
  return { item: await fetchGrammarItemById(itemId), cached: result.cached }
}

export async function fetchVocabularyLessonAnalyses(): Promise<VocabularyLessonAnalysis[]> {
  if (!supabase) throw new JapaneseLessonAnalysisError("not_configured")
  const columns = "id, user_id, textbook_key, volume, lesson_number, analysis_status, analysis_json, created_at, updated_at"
  const { data, error } = await supabase.from("vocabulary_lesson_analyses").select(columns).order("lesson_number")
  if (error) throw new JapaneseLessonAnalysisError("load_failed", error)
  return (data ?? []).map(parseVocabularyLessonAnalysis).filter((item): item is VocabularyLessonAnalysis => item !== null)
}

export async function analyzeVocabularyLesson(lessonNumber: number, force = false): Promise<{ analysis: VocabularyLessonAnalysis; cached: boolean }> {
  const result = await invoke(LESSON_ANALYSIS_FUNCTION_NAME, force ? { lessonNumber, force: true } : { lessonNumber })
  const analyses = await fetchVocabularyLessonAnalyses()
  const analysis = analyses.find((item) => item.lessonNumber === lessonNumber)
  if (!analysis) throw new JapaneseLessonAnalysisError("analysis_failed")
  return { analysis, cached: result.cached }
}
