import { supabase } from "@/lib/supabase"
import { createVocabularyWord } from "@/lib/vocabularyService"
import { normalizeVocabularyTerm } from "@/lib/vocabulary"
import type { ExtractedVocabularyWord, VocabularyImageExtraction, VocabularyWord } from "@/types/vocabulary"

export type VocabularyImageImportErrorCode = "not_configured" | "auth_required" | "unsupported_image" | "invalid_image_size" | "provider_error" | "provider_timeout" | "provider_network_error" | "provider_invalid_response" | "provider_empty_content" | "provider_output_truncated" | "provider_content_filtered" | "provider_resource_error" | "invalid_json" | "unsupported_response_shape" | "invalid_word_item" | "empty_vocabulary_result"
export class VocabularyImageImportError extends Error { constructor(public readonly code: VocabularyImageImportErrorCode, public readonly cause?: unknown, public readonly status: number | null = null) { super(code) } }

function clean(value: unknown, max: number): string { return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "" }
function cleanList(value: unknown, count: number, max: number) { return Array.isArray(value) ? value.map((item) => clean(item, max)).filter(Boolean).slice(0, count) : [] }

export function parseVocabularyImageExtraction(value: unknown): VocabularyImageExtraction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (row.version !== 1 || !Array.isArray(row.words)) return null
  const words = row.words.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return []
    const word = item as Record<string, unknown>; const term = clean(word.term, 160)
    if (!term) return []
    return [{ term, reading: clean(word.reading, 160), partOfSpeech: clean(word.partOfSpeech, 80), meanings: cleanList(word.meanings, 8, 300), sourceText: clean(word.sourceText, 500), confidence: typeof word.confidence === "number" ? Math.max(0, Math.min(1, word.confidence)) : 0, warnings: cleanList(word.warnings, 5, 300) }]
  })
  return { version: 1, words, warnings: cleanList(row.warnings, 8, 300) }
}

export async function extractVocabularyFromImage(file: File, lessonNumber: number): Promise<VocabularyImageExtraction> {
  if (!supabase) throw new VocabularyImageImportError("not_configured")
  const form = new FormData(); form.set("image", file); form.set("lessonNumber", String(lessonNumber))
  const { data, error } = await supabase.functions.invoke("extract-vocabulary-from-image", { body: form })
  if (error) {
    const context = "context" in error && error.context instanceof Response ? error.context : null
    let code: VocabularyImageImportErrorCode = context?.status === 401 ? "auth_required" : context?.status === 415 ? "unsupported_image" : "provider_error"
    try { const body = context ? await context.clone().json() as { code?: unknown } : null; if (typeof body?.code === "string" && ["auth_required", "unsupported_image", "invalid_image_size", "provider_error", "provider_timeout", "provider_network_error", "provider_invalid_response", "provider_empty_content", "provider_output_truncated", "provider_content_filtered", "provider_resource_error", "invalid_json", "unsupported_response_shape", "invalid_word_item", "empty_vocabulary_result"].includes(body.code)) code = body.code as VocabularyImageImportErrorCode } catch { /* readable fallback already selected */ }
    const status = context?.status ?? null
    throw new VocabularyImageImportError(code, error, status)
  }
  const parsed = parseVocabularyImageExtraction(data?.extraction)
  if (!parsed) throw new VocabularyImageImportError("unsupported_response_shape")
  return parsed
}

export interface EditableImportedWord extends ExtractedVocabularyWord { id: string; selected: boolean }
export interface VocabularyBatchImportResult { created: VocabularyWord[]; existing: EditableImportedWord[]; failed: EditableImportedWord[] }

export function createEditableImportedWords(extraction: VocabularyImageExtraction): EditableImportedWord[] {
  return extraction.words.map((word, index) => ({ ...word, id: `vision-${index}-${normalizeVocabularyTerm(word.term)}`, selected: word.confidence >= 0.75 }))
}

export async function importVocabularyWordsForLesson(items: readonly EditableImportedWord[], existingWords: readonly VocabularyWord[], lessonNumber: number): Promise<VocabularyBatchImportResult> {
  const selected = items.filter((item) => item.selected && item.term.trim())
  const existing: EditableImportedWord[] = []; const failed: EditableImportedWord[] = []; const created: VocabularyWord[] = []
  const known = new Set(existingWords.filter((word) => word.language === "ja-JP").map((word) => normalizeVocabularyTerm(word.term)))
  for (const item of selected) {
    const key = normalizeVocabularyTerm(item.term)
    if (known.has(key)) { existing.push(item); continue }
    try {
      const word = await createVocabularyWord({ term: item.term, language: "ja-JP", reading: item.reading, meaning: item.meanings.join("；"), notes: item.partOfSpeech, courseName: "大家的日语", courseKey: "minna_no_nihongo", textbookKey: "minna_no_nihongo", lessonNumber, mastery: "new" })
      created.push(word); known.add(key)
    } catch { failed.push(item) }
  }
  return { created, existing, failed }
}
