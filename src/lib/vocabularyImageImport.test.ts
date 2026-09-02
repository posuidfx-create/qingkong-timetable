import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase", () => ({ supabase: null }))
vi.mock("@/lib/vocabularyService", () => ({ createVocabularyWord: vi.fn() }))

import { buildVocabularyVisionFormData, createEditableImportedWords, decideVocabularyDefaultSelection, findVocabularyCoverageGapTileIndexes, importVocabularyWordsForLesson, parseVocabularyImageExtraction } from "@/lib/vocabularyImageImport"
import { createVocabularyWord } from "@/lib/vocabularyService"
import type { PreparedVocabularyImage } from "@/lib/vocabularyImageTiling"
import type { VocabularyWord } from "@/types/vocabulary"
import { buildVocabularyContentFingerprint, buildVocabularyTranscriptionPrompt, buildVocabularyValidationPrompt, mergeVocabularyTileCandidates, normalizeVocabularyValidationResponse, normalizeVocabularyVisionResponse, stripCompleteJsonFence, VocabularyResponseError } from "../../supabase/functions/extract-vocabulary-from-image/analysis"
import { requestDeepSeekMultiVisionJsonResult } from "../../supabase/functions/analyze-learning-record/deepseek"

const word = (term: string, lessonNumber: number | null): VocabularyWord => ({ id: term, userId: "u", term, language: "ja-JP", reading: null, meaning: null, notes: null, courseName: "大家的日语", courseKey: "minna_no_nihongo", textbookKey: "minna_no_nihongo", volume: lessonNumber && lessonNumber > 25 ? "beginner_2" : "beginner_1", lessonNumber, mastery: "new", analysisStatus: "uploaded", analysis: null, createdAt: "", updatedAt: "" })
const row = (patch: Record<string, unknown> = {}) => ({ term: "予定", readingVisible: "よてい", meaningVisible: "计划", sourceText: "予定（よてい）计划", tileIndex: 0, rowOrder: 0, confidence: .95, warnings: [], ...patch })
const rawCandidate = (patch: Record<string, unknown> = {}) => ({ id: "tile-0-row-0", term: "予定", reading: "よてい", partOfSpeech: "", meanings: ["计划"], sourceText: "予定（よてい）计划", tileIndex: 0, rowOrder: 0, confidence: .95, warnings: [], needsReview: false, recognitionStatus: "clear" as const, ...patch })
const stageMeta = (finalReviewCount: number, tileCandidateCounts = [finalReviewCount, 0, 0, 0]) => ({ possibleCoverageGap: false, coverageGapTileIndexes: [], stageDiagnostics: { visionRawCount: finalReviewCount, afterTileMergeCount: finalReviewCount, afterValidationCount: finalReviewCount, finalReviewCount, tileCandidateCounts } })

describe("Vocabulary image accuracy pipeline", () => {
  it("uses a fidelity-only transcription prompt without textbook completion", () => {
    const prompt = buildVocabularyTranscriptionPrompt(4)
    expect(prompt).toContain("4 image parts")
    expect(prompt).toContain("actually visible")
    expect(prompt).toContain("Never complete a textbook lesson")
    expect(prompt).toContain("reading or meaning is not visibly printed, return null")
    expect(prompt).toContain("PASS 1")
    expect(prompt).toContain("PASS 2")
    expect(prompt).toContain("Do not skip a clearly visible term")
    expect(prompt).not.toContain("lesson 39")
  })

  it("preserves sourceText and keeps missing reading and meaning empty", () => {
    const parsed = normalizeVocabularyVisionResponse({ version: 1, rows: [row({ readingVisible: null, meaningVisible: null, sourceText: "心配します" })], warnings: [] }, 4)
    expect(parsed.words[0]).toMatchObject({ term: "予定", reading: "", meanings: [], sourceText: "心配します", tileIndex: 0, rowOrder: 0, recognitionStatus: "review" })
    expect(createEditableImportedWords(parseVocabularyImageExtraction(parsed)!)[0]?.selected).toBe(false)
  })

  it("deduplicates overlapping tiles deterministically", () => {
    const merged = mergeVocabularyTileCandidates([rawCandidate(), rawCandidate({ id: "tile-1-row-1", tileIndex: 1, rowOrder: 1 })])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.needsReview).toBe(false)
  })

  it("does not merge similar adjacent words or identical terms outside overlap-adjacent tiles", () => {
    expect(mergeVocabularyTileCandidates([rawCandidate({ term: "心配します" }), rawCandidate({ id: "similar", term: "心配しません", tileIndex: 1 })])).toHaveLength(2)
    expect(mergeVocabularyTileCandidates([rawCandidate(), rawCandidate({ id: "far", tileIndex: 2 })])).toHaveLength(2)
  })

  it("marks conflicting overlap results for review and does not silently select a reading", () => {
    const merged = mergeVocabularyTileCandidates([rawCandidate(), rawCandidate({ id: "tile-1-row-0", tileIndex: 1, reading: "よてえ", meanings: ["安排"], sourceText: "予定 よてえ 安排" })])
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ reading: "", meanings: [], needsReview: true, recognitionStatus: "review" })
    expect(merged[0]?.warnings).toContain("overlap_conflict")
  })

  it("lets text validation update only known candidate ids and cannot fill missing fields", () => {
    const candidate = normalizeVocabularyVisionResponse({ version: 1, rows: [row({ readingVisible: null, meaningVisible: null })], warnings: [] }, 4).words
    const validationPrompt = buildVocabularyValidationPrompt(candidate)
    expect(validationPrompt).toContain("Only return the supplied ids")
    expect(validationPrompt).toContain("Keep null fields null")
    const validated = normalizeVocabularyValidationResponse({ version: 1, items: [{ id: candidate[0]?.id, term: "予定", reading: "よてい", meaning: "计划", confidence: .9, warnings: [] }], warnings: [] }, candidate)
    expect(validated.words[0]).toMatchObject({ reading: "", meanings: [] })
    expect(() => normalizeVocabularyValidationResponse({ version: 1, items: [{ id: "invented", term: "宿題", reading: null, meaning: null, confidence: .9, warnings: [] }], warnings: [] }, candidate)).toThrow("invalid_word_item")
  })

  it("keeps every visible candidate when validation omits incomplete items", () => {
    const vision = normalizeVocabularyVisionResponse({ version: 1, rows: [row({ term: "心配します", readingVisible: null, meaningVisible: null }), row({ term: "場所", tileIndex: 1, readingVisible: "ばしょ", meaningVisible: "场所" })], warnings: [] }, 4)
    const validated = normalizeVocabularyValidationResponse({ version: 1, items: [{ id: vision.words[1]?.id, term: "場所", reading: "ばしょ", meaning: "场所", confidence: .9, warnings: [] }], warnings: [] }, vision.words, 4, vision)
    expect(validated.words).toHaveLength(2)
    expect(validated.words[0]).toMatchObject({ term: "心配します", reading: "", meanings: [], needsReview: true, recognitionStatus: "review" })
    expect(validated.words[0]?.warnings).toContain("validation_missing")
  })

  it("keeps stage counts stable across 35 raw, merged and validated candidates", () => {
    const tileCandidateCounts = [9, 9, 9, 8]
    const rows = tileCandidateCounts.flatMap((amount, tileIndex) => Array.from({ length: amount }, (_, rowOrder) => row({ term: `語${tileIndex}-${rowOrder}`, readingVisible: `ご${tileIndex}-${rowOrder}`, meaningVisible: `词${tileIndex}-${rowOrder}`, sourceText: `語${tileIndex}-${rowOrder}`, tileIndex, rowOrder })))
    const vision = normalizeVocabularyVisionResponse({ version: 1, rows, warnings: [] }, 4)
    const validated = normalizeVocabularyValidationResponse({ version: 1, items: vision.words.map((item) => ({ id: item.id, term: item.term, reading: item.reading, meaning: item.meanings[0], confidence: item.confidence, warnings: [] })), warnings: [] }, vision.words, 4, vision)
    expect(validated.words).toHaveLength(35)
    expect(validated.stageDiagnostics).toEqual({ visionRawCount: 35, afterTileMergeCount: 35, afterValidationCount: 35, finalReviewCount: 35, tileCandidateCounts })
  })

  it("flags row-order coverage gaps without inventing missing rows", () => {
    const vision = normalizeVocabularyVisionResponse({ version: 1, rows: [row({ rowOrder: 0 }), row({ term: "場所", rowOrder: 2 })], warnings: [] }, 4)
    expect(vision).toMatchObject({ possibleCoverageGap: true, coverageGapTileIndexes: [0] })
    expect(findVocabularyCoverageGapTileIndexes(vision.words, 4)).toEqual([0])
    expect(vision.words).toHaveLength(2)
  })

  it("rejects a validator replacement that is not a conservative correction", () => {
    const candidate = normalizeVocabularyVisionResponse({ version: 1, rows: [row()], warnings: [] }, 4).words
    const validated = normalizeVocabularyValidationResponse({ version: 1, items: [{ id: candidate[0]?.id, term: "全く別の語", reading: "よてい", meaning: "计划", confidence: .9, warnings: [] }], warnings: [] }, candidate)
    expect(validated.words[0]?.term).toBe("予定")
    expect(validated.words[0]?.warnings).toContain("validation_term_rejected")
  })

  it("selects only high-confidence conflict-free complete terms by default", () => {
    const extraction = parseVocabularyImageExtraction({ version: 1, tileCount: 4, ...stageMeta(3, [3, 0, 0, 0]), words: [
      { ...row(), reading: "よてい", meanings: ["计划"], needsReview: false, recognitionStatus: "clear" },
      { ...row({ term: "場所", confidence: .7 }), reading: "ばしょ", meanings: ["场所"], needsReview: false, recognitionStatus: "review" },
      { ...row({ term: "不完…", confidence: .95 }), reading: "", meanings: [], needsReview: true, recognitionStatus: "unconfirmed" },
    ], warnings: [] })!
    expect(createEditableImportedWords(extraction).map((item) => item.selected)).toEqual([true, false, false])
  })

  it("selects a high-confidence term with visible source support and no warning", () => {
    expect(decideVocabularyDefaultSelection(rawCandidate())).toEqual({ selected: true, reason: "high_confidence", risk: "reliable" })
  })

  it("keeps tile conflicts and genuine validation warnings unselected", () => {
    expect(decideVocabularyDefaultSelection(rawCandidate({ warnings: ["overlap_conflict"], needsReview: true }))).toEqual({ selected: false, reason: "tile_conflict", risk: "confirm" })
    expect(decideVocabularyDefaultSelection(rawCandidate({ warnings: ["validation_term_rejected"], needsReview: true }))).toEqual({ selected: false, reason: "validation_warning", risk: "confirm" })
  })

  it("does not treat a batch validation outage as candidate-level OCR risk", () => {
    expect(decideVocabularyDefaultSelection(rawCandidate({ warnings: ["batch_validation_failed"], needsReview: true }))).toEqual({ selected: true, reason: "high_confidence", risk: "reliable" })
    expect(decideVocabularyDefaultSelection(rawCandidate({ reading: "", warnings: ["incomplete_visible_fields", "batch_validation_failed"], needsReview: true }))).toEqual({ selected: false, reason: "incomplete_reading", risk: "supplement" })
  })

  it("keeps low-confidence and coverage-warning candidates unselected", () => {
    expect(decideVocabularyDefaultSelection(rawCandidate({ confidence: .79 }))).toEqual({ selected: false, reason: "low_confidence", risk: "confirm" })
    expect(decideVocabularyDefaultSelection(rawCandidate({ tileIndex: 2 }), [2])).toEqual({ selected: false, reason: "coverage_warning", risk: "confirm" })
  })

  it("separates reliable terms with missing optional fields from OCR risk", () => {
    expect(decideVocabularyDefaultSelection(rawCandidate({ reading: "" }))).toEqual({ selected: false, reason: "incomplete_reading", risk: "supplement" })
    expect(decideVocabularyDefaultSelection(rawCandidate({ meanings: [] }))).toEqual({ selected: false, reason: "incomplete_meaning", risk: "supplement" })
  })

  it("derives selection reasons deterministically", () => {
    const candidate = rawCandidate({ confidence: .91 })
    expect(decideVocabularyDefaultSelection(candidate)).toEqual(decideVocabularyDefaultSelection(candidate))
  })

  it("builds one FormData payload containing all prepared tiles", () => {
    const prepared: PreparedVocabularyImage = { tiles: Array.from({ length: 4 }, (_, index) => new File([String(index)], `tile-${index}.jpg`, { type: "image/jpeg" })), quality: { width: 1000, height: 1600, aspectRatio: 1.6, tileCount: 4, partitioned: true, sharpness: 100, blurry: false } }
    const form = buildVocabularyVisionFormData(prepared, 39)
    expect(form.getAll("tiles")).toHaveLength(4)
    expect(form.get("lessonNumber")).toBe("39")
  })

  it("sends multiple image parts in one Vision request with original detail", async () => {
    let requestBody: Record<string, unknown> = {}
    await requestDeepSeekMultiVisionJsonResult("secret", "vision", "json", [{ mimeType: "image/jpeg", bytes: new Uint8Array([1]) }, { mimeType: "image/png", bytes: new Uint8Array([2]) }], 2048, async (_input, init) => { requestBody = JSON.parse(String(init?.body)); return Response.json({ choices: [{ finish_reason: "stop", message: { content: "{}" } }] }) }, { thinkingDisabled: true })
    const content = ((requestBody.messages as Array<{ content: Array<Record<string, unknown>> }>)[1]?.content ?? [])
    expect(content.filter((part) => part.type === "image_url")).toHaveLength(2)
    expect(JSON.stringify(content)).toContain('"detail":"original"')
  })

  it("keeps strict JSON parsing and content-free fingerprints", () => {
    const payload = JSON.stringify({ version: 1, rows: [row()], warnings: [] })
    expect(normalizeVocabularyVisionResponse(`\`\`\`json\n${payload}\n\`\`\``, 4).words[0]?.term).toBe("予定")
    expect(stripCompleteJsonFence(`\`\`\`json\n${payload}\n\`\`\``)).toBe(payload)
    expect(() => normalizeVocabularyVisionResponse("not json", 4)).toThrow(VocabularyResponseError)
    const fingerprint = buildVocabularyContentFingerprint("```json\n{broken}\n```", new SyntaxError("Unexpected token at position 1"))
    expect(JSON.stringify(fingerprint)).not.toContain("broken")
  })

  it("deduplicates existing words and imports selected items without per-word AI", async () => {
    vi.mocked(createVocabularyWord).mockResolvedValueOnce(word("場所", 32))
    const items = createEditableImportedWords({ version: 1, tileCount: 4, ...stageMeta(2, [1, 1, 0, 0]), words: [
      { term: "予定", reading: "よてい", partOfSpeech: "", meanings: ["计划"], sourceText: "予定", tileIndex: 0, rowOrder: 0, confidence: .9, warnings: [], needsReview: false, recognitionStatus: "clear" },
      { term: "場所", reading: "ばしょ", partOfSpeech: "", meanings: ["场所"], sourceText: "場所", tileIndex: 1, rowOrder: 0, confidence: .9, warnings: [], needsReview: false, recognitionStatus: "clear" },
    ], warnings: [] })
    const result = await importVocabularyWordsForLesson(items, [word("予定", 20)], 32)
    expect(result.existing.map((item) => item.term)).toEqual(["予定"]); expect(result.created.map((item) => item.term)).toEqual(["場所"]); expect(createVocabularyWord).toHaveBeenCalledTimes(1)
  })
})
