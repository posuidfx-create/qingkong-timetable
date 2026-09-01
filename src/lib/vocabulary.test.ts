import { describe, expect, it } from "vitest"

import { buildVocabularyInsertRow, detectVocabularyLanguage, hasDuplicateVocabularyWord, parseVocabularyAnalysis, parseVocabularyWord, searchVocabularyWords, sortVocabularyWords } from "@/lib/vocabulary"
import type { VocabularyWord } from "@/types/vocabulary"

const word = (overrides: Partial<VocabularyWord> = {}): VocabularyWord => ({
  id: "00000000-0000-4000-8000-000000000001", userId: "user-1", term: "勉強", language: "ja-JP", reading: "べんきょう", meaning: "学习；用功", notes: "综合日语", courseName: "综合日语（三）", courseKey: "course-ja", mastery: "learning", analysisStatus: "completed", analysis: { version: 1, language: "ja-JP", reading: "べんきょう", pronunciation: "benkyō", partsOfSpeech: ["名词", "サ变动词"], meanings: ["学习"], usageNotes: ["用于描述学习行为"], collocations: ["日本語を勉強する"], forms: [], confusions: [], examples: [{ text: "毎日勉強します。", translation: "每天学习。" }], memoryTip: "把它与学习场景关联。", warnings: [] }, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", ...overrides,
})
describe("vocabulary domain", () => {
  it("detects Japanese, Chinese and English speech languages", () => {
    expect(detectVocabularyLanguage("勉強する")).toBe("ja-JP")
    expect(detectVocabularyLanguage("学习")).toBe("zh-CN")
    expect(detectVocabularyLanguage("effort")).toBe("en-US")
  })

  it("searches saved and AI-assisted dictionary fields", () => {
    const words = [word(), word({ id: "2", term: "effort", language: "en-US", reading: "/ˈefərt/", meaning: "努力", analysis: null })]
    expect(searchVocabularyWords(words, "べんきょう").map((item) => item.term)).toEqual(["勉強"])
    expect(searchVocabularyWords(words, "日本語を勉強する").map((item) => item.term)).toEqual(["勉強"])
    expect(searchVocabularyWords(words, "努力").map((item) => item.term)).toEqual(["effort"])
  })

  it("prevents case-insensitive duplicates only within the same language", () => {
    const words = [word({ term: "Effort", language: "en-US" })]
    expect(hasDuplicateVocabularyWord(words, " effort ", "en-US")).toBe(true)
    expect(hasDuplicateVocabularyWord(words, "effort", "en-GB")).toBe(false)
  })

  it("sorts 500 words without creating per-row state", () => {
    const words = Array.from({ length: 500 }, (_, index) => word({ id: String(index), term: `word-${String(499 - index).padStart(3, "0")}`, language: "en-US", createdAt: new Date(index * 1000).toISOString(), analysis: null }))
    expect(sortVocabularyWords(words, "alphabetical", "en-US")).toHaveLength(500)
    expect(sortVocabularyWords(words, "recent", "en-US")[0]?.id).toBe("499")
  })

  it("maps a draft to authenticated business columns only", () => {
    const row = buildVocabularyInsertRow({ term: " effort ", language: "en-US", reading: "", meaning: " 努力 ", notes: "", courseName: "", courseKey: "", mastery: "new" }, "user-1", "word-1")
    expect(row).toMatchObject({ term: "effort", meaning: "努力", reading: null, user_id: "user-1" })
    expect(row).not.toHaveProperty("analysis_status")
    expect(row).not.toHaveProperty("analysis_json")
  })

  it("runtime-validates structured AI analysis and database rows", () => {
    const analysis = parseVocabularyAnalysis(word().analysis)
    expect(analysis?.examples[0]?.text).toBe("毎日勉強します。")
    expect(parseVocabularyWord({ id: "x" })).toBeNull()
  })
})
