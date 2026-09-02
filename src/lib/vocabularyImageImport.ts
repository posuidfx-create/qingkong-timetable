import { supabase } from "@/lib/supabase"
import { prepareVocabularyImage, type PreparedVocabularyImage, type VocabularyCropRect } from "@/lib/vocabularyImageTiling"
import { createVocabularyWord } from "@/lib/vocabularyService"
import { normalizeVocabularyTerm } from "@/lib/vocabulary"
import type { ExtractedVocabularyWord, VocabularyImageExtraction, VocabularyWord } from "@/types/vocabulary"

export type VocabularyImageImportErrorCode = "not_configured" | "auth_required" | "unsupported_image" | "invalid_image_size" | "image_blurry" | "provider_error" | "provider_timeout" | "provider_network_error" | "provider_invalid_response" | "provider_empty_content" | "provider_output_truncated" | "provider_content_filtered" | "provider_resource_error" | "invalid_json" | "unsupported_response_shape" | "invalid_word_item" | "empty_vocabulary_result"
export class VocabularyImageImportError extends Error { constructor(public readonly code: VocabularyImageImportErrorCode, public readonly cause?: unknown, public readonly status: number | null = null) { super(code) } }

function clean(value: unknown, max: number): string { return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "" }
function cleanList(value: unknown, count: number, max: number) { return Array.isArray(value) ? value.map((item) => clean(item, max)).filter(Boolean).slice(0, count) : [] }
function count(value: unknown): number | null { return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null }
function countList(value: unknown, max: number): number[] | null { if (!Array.isArray(value) || value.length > max) return null; const values = value.map(count); return values.every((item): item is number => item !== null) ? values : null }

export function parseVocabularyImageExtraction(value: unknown): VocabularyImageExtraction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (row.version !== 1 || !Array.isArray(row.words)) return null
  const words = row.words.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return []
    const word = item as Record<string, unknown>; const term = clean(word.term, 160)
    if (!term) return []
    const tileIndex = typeof word.tileIndex === "number" && Number.isInteger(word.tileIndex) && word.tileIndex >= 0 && word.tileIndex < 6 ? word.tileIndex : null
    const rowOrder = typeof word.rowOrder === "number" && Number.isInteger(word.rowOrder) && word.rowOrder >= 0 ? word.rowOrder : null
    const recognitionStatus = ["clear", "review", "unconfirmed"].includes(String(word.recognitionStatus)) ? word.recognitionStatus as ExtractedVocabularyWord["recognitionStatus"] : null
    if (tileIndex === null || rowOrder === null || recognitionStatus === null || typeof word.needsReview !== "boolean") return []
    return [{ term, reading: clean(word.reading, 160), partOfSpeech: clean(word.partOfSpeech, 80), meanings: cleanList(word.meanings, 8, 300), sourceText: clean(word.sourceText, 500), tileIndex, rowOrder, confidence: typeof word.confidence === "number" ? Math.max(0, Math.min(1, word.confidence)) : 0, warnings: cleanList(word.warnings, 5, 300), needsReview: word.needsReview, recognitionStatus }]
  })
  const tileCount = typeof row.tileCount === "number" && Number.isInteger(row.tileCount) && row.tileCount >= 3 && row.tileCount <= 6 ? row.tileCount : null
  const coverageGapTileIndexes = countList(row.coverageGapTileIndexes, 6); const diagnostics = row.stageDiagnostics
  if (tileCount === null || typeof row.possibleCoverageGap !== "boolean" || !coverageGapTileIndexes || coverageGapTileIndexes.some((item) => item >= tileCount) || !diagnostics || typeof diagnostics !== "object" || Array.isArray(diagnostics)) return null
  const stage = diagnostics as Record<string, unknown>; const tileCandidateCounts = countList(stage.tileCandidateCounts, 6); const visionRawCount = count(stage.visionRawCount); const afterTileMergeCount = count(stage.afterTileMergeCount); const afterValidationCount = count(stage.afterValidationCount); const finalReviewCount = count(stage.finalReviewCount)
  if (!tileCandidateCounts || tileCandidateCounts.length !== tileCount || [visionRawCount, afterTileMergeCount, afterValidationCount, finalReviewCount].some((item) => item === null)) return null
  return { version: 1, words, warnings: cleanList(row.warnings, 8, 300), tileCount, possibleCoverageGap: row.possibleCoverageGap, coverageGapTileIndexes, stageDiagnostics: { visionRawCount: visionRawCount!, afterTileMergeCount: afterTileMergeCount!, afterValidationCount: afterValidationCount!, finalReviewCount: finalReviewCount!, tileCandidateCounts } }
}

export function findVocabularyCoverageGapTileIndexes(words: readonly Pick<ExtractedVocabularyWord, "tileIndex" | "rowOrder">[], tileCount: number): number[] {
  return Array.from({ length: tileCount }, (_, tileIndex) => tileIndex).filter((tileIndex) => {
    const orders = [...new Set(words.filter((word) => word.tileIndex === tileIndex).map((word) => word.rowOrder))].sort((a, b) => a - b)
    return orders.some((order, index) => index > 0 && order - orders[index - 1] > 1)
  })
}

export function buildVocabularyVisionFormData(prepared: PreparedVocabularyImage, lessonNumber: number): FormData {
  const form = new FormData(); form.set("lessonNumber", String(lessonNumber)); prepared.tiles.forEach((tile) => form.append("tiles", tile, tile.name)); return form
}

export async function invokeVocabularyImageExtraction(prepared: PreparedVocabularyImage, lessonNumber: number): Promise<VocabularyImageExtraction> {
  if (!supabase) throw new VocabularyImageImportError("not_configured")
  const form = buildVocabularyVisionFormData(prepared, lessonNumber)
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

export async function extractVocabularyFromImage(file: File, lessonNumber: number, crop?: VocabularyCropRect, allowBlurry = false): Promise<{ extraction: VocabularyImageExtraction; prepared: PreparedVocabularyImage }> {
  const prepared = await prepareVocabularyImage(file, crop)
  if (prepared.quality.blurry && !allowBlurry) throw new VocabularyImageImportError("image_blurry", prepared)
  return { extraction: await invokeVocabularyImageExtraction(prepared, lessonNumber), prepared }
}

export interface EditableImportedWord extends ExtractedVocabularyWord { id: string; selected: boolean }
export interface VocabularyBatchImportResult { created: VocabularyWord[]; existing: EditableImportedWord[]; failed: EditableImportedWord[] }

export type VocabularySelectionReason = "high_confidence" | "low_confidence" | "incomplete_reading" | "incomplete_meaning" | "tile_conflict" | "validation_warning" | "coverage_warning" | "other"
export type VocabularyReviewRisk = "reliable" | "supplement" | "confirm"
export interface VocabularySelectionDecision { selected: boolean; reason: VocabularySelectionReason; risk: VocabularyReviewRisk }

const DEFAULT_SELECTION_CONFIDENCE = 0.8
const INCOMPLETE_FIELD_WARNING = "incomplete_visible_fields"
const NON_BLOCKING_WARNINGS = new Set([INCOMPLETE_FIELD_WARNING, "batch_validation_failed"])
const RISK_WARNINGS = new Set(["overlap_conflict", "validation_missing", "validation_term_rejected"])

function hasCompleteJapaneseTerm(term: string): boolean {
  return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(term) && !/[….・･—-]$/.test(term.trim())
}

function sourceSupportsTerm(term: string, sourceText: string): boolean {
  const normalizedTerm = normalizeVocabularyTerm(term)
  const normalizedSource = normalizeVocabularyTerm(sourceText)
  return Boolean(normalizedTerm) && normalizedSource.includes(normalizedTerm)
}

export function decideVocabularyDefaultSelection(word: ExtractedVocabularyWord, coverageGapTileIndexes: readonly number[] = []): VocabularySelectionDecision {
  if (!hasCompleteJapaneseTerm(word.term) || !sourceSupportsTerm(word.term, word.sourceText)) return { selected: false, reason: "other", risk: "confirm" }
  if (word.warnings.includes("overlap_conflict")) return { selected: false, reason: "tile_conflict", risk: "confirm" }
  if (coverageGapTileIndexes.includes(word.tileIndex)) return { selected: false, reason: "coverage_warning", risk: "confirm" }
  if (word.warnings.some((warning) => RISK_WARNINGS.has(warning))) return { selected: false, reason: "validation_warning", risk: "confirm" }
  if (word.warnings.some((warning) => !NON_BLOCKING_WARNINGS.has(warning))) return { selected: false, reason: "validation_warning", risk: "confirm" }
  if (word.needsReview && !word.warnings.length) return { selected: false, reason: "other", risk: "confirm" }
  if (word.confidence < DEFAULT_SELECTION_CONFIDENCE) return { selected: false, reason: "low_confidence", risk: "confirm" }
  if (!word.reading) return { selected: false, reason: "incomplete_reading", risk: "supplement" }
  if (!word.meanings.length || word.warnings.includes(INCOMPLETE_FIELD_WARNING)) return { selected: false, reason: "incomplete_meaning", risk: "supplement" }
  return { selected: true, reason: "high_confidence", risk: "reliable" }
}

export function createEditableImportedWords(extraction: VocabularyImageExtraction): EditableImportedWord[] {
  return extraction.words.map((word, index) => ({ ...word, id: `vision-${index}-${normalizeVocabularyTerm(word.term)}`, selected: decideVocabularyDefaultSelection(word, extraction.coverageGapTileIndexes).selected }))
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
