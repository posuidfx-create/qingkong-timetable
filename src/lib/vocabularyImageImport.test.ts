import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase", () => ({ supabase: null }))
vi.mock("@/lib/vocabularyService", () => ({ createVocabularyWord: vi.fn() }))

import { createEditableImportedWords, importVocabularyWordsForLesson, parseVocabularyImageExtraction } from "@/lib/vocabularyImageImport"
import { createVocabularyWord } from "@/lib/vocabularyService"
import type { VocabularyWord } from "@/types/vocabulary"
import { buildVocabularyContentFingerprint, buildVocabularyImagePrompt, normalizeVocabularyImageResponse, normalizeVocabularyTransportResponse, stripCompleteJsonFence, VocabularyResponseError } from "../../supabase/functions/extract-vocabulary-from-image/analysis"
import { requestDeepSeekVisionJsonResult } from "../../supabase/functions/analyze-learning-record/deepseek"

const word = (term: string, lessonNumber: number | null): VocabularyWord => ({ id: term, userId: "u", term, language: "ja-JP", reading: null, meaning: null, notes: null, courseName: "大家的日语", courseKey: "minna_no_nihongo", textbookKey: "minna_no_nihongo", volume: lessonNumber && lessonNumber > 25 ? "beginner_2" : "beginner_1", lessonNumber, mastery: "new", analysisStatus: "uploaded", analysis: null, createdAt: "", updatedAt: "" })

describe("vocabulary image extraction", () => {
  it("normalizes the Vision schema and defaults only high-confidence words selected", () => {
    const parsed = parseVocabularyImageExtraction({ version: 1, words: [{ term: "予定", reading: "よてい", partOfSpeech: "名词", meanings: ["计划"], sourceText: "予定", confidence: .91, warnings: [] }, { term: "場所", reading: "", partOfSpeech: "", meanings: ["场所"], sourceText: "場所", confidence: .4, warnings: ["模糊"] }], warnings: [] })!
    expect(createEditableImportedWords(parsed).map((item) => item.selected)).toEqual([true, false])
    expect(normalizeVocabularyImageResponse(parsed).words[0]?.term).toBe("予定")
  })

  it("requires visible image evidence and forbids textbook completion from memory", () => {
    const prompt = buildVocabularyImagePrompt(32)
    expect(prompt).toContain("Do not complete an official textbook list from memory")
    expect(prompt).toContain("lesson 32")
    expect(prompt).toContain("Return ONLY valid JSON")
    expect(prompt).toContain('{"version":1,"words":[{"term":"予定"')
    expect(prompt).toContain('{"version":1,"words":[],"warnings":[]}')
    expect(prompt).toContain("Do not output Markdown")
  })

  it("accepts only the documented safe root variants", () => {
    const item = { term: "予定", reading: "よてい", meaning: "计划", confidence: "92%", warning: "图像略斜" }
    expect(normalizeVocabularyImageResponse({ words: [item] }).words[0]).toMatchObject({ meanings: ["计划"], confidence: 0.92, warnings: ["图像略斜"] })
    expect(normalizeVocabularyImageResponse([item]).version).toBe(1)
    expect(normalizeVocabularyImageResponse(`\`\`\`json\n${JSON.stringify({ version: 1, words: [{ ...item, meanings: ["计划"], confidence: 92 }] })}\n\`\`\``).words[0]?.confidence).toBe(0.92)
  })

  it("keeps canonical, trimmed and completely fenced JSON on the strict single-parse pipeline", () => {
    const payload = { version: 1, words: [{ term: "予定", meanings: ["计划"], confidence: 0.9 }], warnings: [] }
    const canonical = JSON.stringify(payload)
    expect(normalizeVocabularyImageResponse(canonical).words[0]?.term).toBe("予定")
    expect(normalizeVocabularyImageResponse(`  ${canonical}\n`).words[0]?.term).toBe("予定")
    expect(normalizeVocabularyImageResponse(`\`\`\`json\n${canonical}\n\`\`\``).words[0]?.term).toBe("予定")
    expect(normalizeVocabularyImageResponse(`\`\`\`\n${canonical}\n\`\`\``).words[0]?.term).toBe("予定")
    expect(stripCompleteJsonFence(`\`\`\`json\n${canonical}\n\`\`\``)).toBe(canonical)
    expect(stripCompleteJsonFence(canonical)).toBe(canonical)
  })

  it("accepts an already parsed object but deliberately rejects double-stringified JSON", () => {
    const payload = { version: 1, words: [{ term: "場所", meanings: ["场所"], confidence: 0.9 }], warnings: [] }
    expect(normalizeVocabularyImageResponse(payload).words[0]?.term).toBe("場所")
    expect(() => normalizeVocabularyImageResponse(JSON.stringify(JSON.stringify(payload)))).toThrow("unsupported_response_shape")
  })

  it("prioritizes finish reason and preserves safe transport metadata on a stop/invalid-json response", async () => {
    const fetchResponse = (finishReason: string) => Response.json({
      choices: [{ finish_reason: finishReason, message: { content: "not json" } }],
      usage: { prompt_tokens: 20, completion_tokens: 3 },
    }, { status: 200 })
    await expect(requestDeepSeekVisionJsonResult("secret", "vision", "json", "image/jpeg", new Uint8Array([1]), 2048, async () => fetchResponse("length"), { detailedOutputErrors: true })).rejects.toMatchObject({ code: "provider_output_truncated" })

    const result = await requestDeepSeekVisionJsonResult("secret", "vision", "json", "image/jpeg", new Uint8Array([1]), 2048, async () => fetchResponse("stop"), { detailedOutputErrors: true })
    expect(() => normalizeVocabularyTransportResponse(result.content, result.diagnostics)).toThrow(VocabularyResponseError)
    try { normalizeVocabularyTransportResponse(result.content, result.diagnostics) }
    catch (reason) {
      expect(reason).toMatchObject({
        code: "invalid_json",
        transportDiagnostics: { response: { upstreamHttpStatus: 200, finishReason: "stop", choicesLength: 1, messageKeys: ["content"], contentLength: 8, promptTokens: 20, completionTokens: 3 } },
        fingerprint: { contentType: "string", contentLength: 8, trimmedLength: 8, firstNonWhitespaceClass: "letter", lastNonWhitespaceClass: "letter", hasJsonFence: false, looksLikeJSONObject: false, jsonParseErrorName: "SyntaxError" },
      })
    }
  })

  it("builds a content-free structural fingerprint", () => {
    const fingerprint = buildVocabularyContentFingerprint("```json\n{broken}\n```", new SyntaxError("Unexpected token at position 1"))
    expect(fingerprint).toMatchObject({ contentType: "string", hasJsonFence: true, firstNonWhitespaceClass: "`", jsonParseErrorPosition: 1 })
    expect(JSON.stringify(fingerprint)).not.toContain("broken")
  })

  it("normalizes numeric confidence variants without weakening its range", () => {
    const create = (value: unknown) => normalizeVocabularyImageResponse({ words: [{ term: "場所", meanings: ["场所"], confidence: value }] }).words[0]?.confidence
    expect([create(0.92), create("0.92"), create(92), create("92%")]).toEqual([0.92, 0.92, 0.92, 0.92])
    expect(() => create(101)).toThrow("invalid_word_item")
  })

  it("rejects malformed, unknown, tool-call-like and invalid word payloads with precise codes", () => {
    expect(() => normalizeVocabularyImageResponse("not json")).toThrow("invalid_json")
    expect(() => normalizeVocabularyImageResponse("<html></html>")).toThrow("invalid_json")
    expect(() => normalizeVocabularyImageResponse({ result: [] })).toThrow("unsupported_response_shape")
    expect(() => normalizeVocabularyImageResponse({ tool_calls: [], words: [] })).toThrow("unsupported_response_shape")
    expect(() => normalizeVocabularyImageResponse({ words: [] })).toThrow("empty_vocabulary_result")
    expect(() => normalizeVocabularyImageResponse({ words: [{ meanings: ["计划"], confidence: .9 }] })).toThrow("invalid_word_item")
    expect(() => normalizeVocabularyImageResponse({ words: [{ term: "予定", meanings: [], confidence: .9 }] })).toThrow("invalid_word_item")
  })

  it("deduplicates existing words and imports selected items into the current lesson without per-word AI", async () => {
    vi.mocked(createVocabularyWord).mockResolvedValueOnce(word("場所", 32))
    const items = createEditableImportedWords({ version: 1, words: [{ term: "予定", reading: "よてい", partOfSpeech: "名词", meanings: ["计划"], sourceText: "予定", confidence: .9, warnings: [] }, { term: "場所", reading: "ばしょ", partOfSpeech: "名词", meanings: ["场所"], sourceText: "場所", confidence: .9, warnings: [] }], warnings: [] })
    const result = await importVocabularyWordsForLesson(items, [word("予定", 20)], 32)
    expect(result.existing.map((item) => item.term)).toEqual(["予定"])
    expect(result.created.map((item) => item.term)).toEqual(["場所"])
    expect(createVocabularyWord).toHaveBeenCalledWith(expect.objectContaining({ lessonNumber: 32, textbookKey: "minna_no_nihongo" }))
  })

  it("keeps failed items recoverable for retry", async () => {
    vi.mocked(createVocabularyWord).mockRejectedValueOnce(new Error("network"))
    const items = createEditableImportedWords({ version: 1, words: [{ term: "予約", reading: "よやく", partOfSpeech: "名词", meanings: ["预约"], sourceText: "予約", confidence: .95, warnings: [] }], warnings: [] })
    expect((await importVocabularyWordsForLesson(items, [], 28)).failed.map((item) => item.term)).toEqual(["予約"])
  })
})
