import { describe, expect, it } from "vitest"

import { BEGINNER_ONE_RANGE, BEGINNER_TWO_RANGE, buildGrammarInsertRow, buildLessonCounts, getJapaneseLessonVolume, getLessonNumberFromPath, getLessonPath, getLessonsForVolume, isWordUnclassified, parseGrammarAnalysis, parseLessonAnalysis, searchGrammarItems, wordBelongsToLesson } from "@/lib/japaneseLessons"
import type { GrammarItem, VocabularyWord } from "@/types/vocabulary"

const word = (lessonNumber: number | null, overrides: Partial<VocabularyWord> = {}): VocabularyWord => ({ id: crypto.randomUUID(), userId: "user-1", term: "勉強", language: "ja-JP", reading: null, meaning: "学习", notes: null, courseName: null, courseKey: null, textbookKey: lessonNumber ? "minna_no_nihongo" : null, volume: lessonNumber ? getJapaneseLessonVolume(lessonNumber) : null, lessonNumber, mastery: "new", analysisStatus: "uploaded", analysis: null, createdAt: "2026-09-01", updatedAt: "2026-09-01", ...overrides })
const grammar = (lessonNumber: number, overrides: Partial<GrammarItem> = {}): GrammarItem => ({ id: crypto.randomUUID(), userId: "user-1", textbookKey: "minna_no_nihongo", volume: getJapaneseLessonVolume(lessonNumber), lessonNumber, pattern: "～と思います", meaning: "我认为……", connection: "普通形", usageNote: null, example: null, exampleTranslation: null, personalNote: "第28课", mastery: "learning", analysisStatus: "uploaded", analysis: null, createdAt: "2026-09-01", updatedAt: "2026-09-01", ...overrides })

describe("Japanese lesson domain", () => {
  it("supports lessons 1-50 and maps the two beginner volumes", () => {
    expect(BEGINNER_ONE_RANGE).toEqual({ start: 1, end: 25 })
    expect(BEGINNER_TWO_RANGE).toEqual({ start: 26, end: 50 })
    expect(getLessonsForVolume("beginner_1")).toEqual(Array.from({ length: 25 }, (_, index) => index + 1))
    expect(getLessonsForVolume("beginner_2")).toEqual(Array.from({ length: 25 }, (_, index) => index + 26))
    expect(getJapaneseLessonVolume(25)).toBe("beginner_1")
    expect(getJapaneseLessonVolume(26)).toBe("beginner_2")
    expect(() => getJapaneseLessonVolume(51)).toThrow("lesson_number_out_of_range")
  })

  it("keeps existing vocabulary unclassified until the user assigns a lesson", () => {
    expect(isWordUnclassified(word(null))).toBe(true)
    expect(wordBelongsToLesson(word(28), 28)).toBe(true)
    expect(wordBelongsToLesson(word(28), 27)).toBe(false)
  })

  it("builds per-lesson word, grammar and mastery counts", () => {
    const counts = buildLessonCounts([word(28), word(28, { mastery: "mastered" })], [grammar(28, { mastery: "mastered" })], [])
    expect(counts).toHaveLength(50)
    expect(counts[27]).toMatchObject({ lessonNumber: 28, words: 2, grammar: 1, masteredWords: 1, masteredGrammar: 1 })
  })

  it("maps grammar drafts only to owned business fields", () => {
    const row = buildGrammarInsertRow({ textbookKey: "minna_no_nihongo", volume: "beginner_2", lessonNumber: 28, pattern: " ～と思います ", meaning: "", connection: " 普通形 ", usageNote: "", example: "", exampleTranslation: "", personalNote: "", mastery: "new" }, "user-1", "item-1")
    expect(row).toMatchObject({ user_id: "user-1", lesson_number: 28, volume: "beginner_2", pattern: "～と思います", meaning: null })
    expect(row).not.toHaveProperty("analysis_json")
  })

  it("searches grammar pattern, meaning, notes and AI analysis", () => {
    const items = [grammar(28, { analysis: { version: 1, meaning: "推量", connection: "普通形", usageNotes: ["意见表达"], commonMistakes: [], comparisons: [], examples: [], memoryTip: "", warnings: [] } })]
    expect(searchGrammarItems(items, "第28课")).toHaveLength(1)
    expect(searchGrammarItems(items, "意见表达")).toHaveLength(1)
  })

  it("parses grammar and lesson AI structures", () => {
    expect(parseGrammarAnalysis({ version: 1, meaning: "含义", connection: "接续", usageNotes: [], commonMistakes: [], comparisons: [], examples: [], memoryTip: "", warnings: [] })?.meaning).toBe("含义")
    expect(parseLessonAnalysis({ version: 1, lessonSummary: "本课总结", keyVocabulary: ["勉強"], keyGrammar: [], commonConfusions: [], reviewChecklist: [], suggestedPractice: [], warnings: [] })?.lessonSummary).toBe("本课总结")
  })

  it("supports direct lesson routes", () => {
    expect(getLessonPath(28)).toBe("/vocabulary/minna-no-nihongo/lesson/28")
    expect(getLessonNumberFromPath("/vocabulary/minna-no-nihongo/lesson/28")).toBe(28)
    expect(getLessonNumberFromPath("/vocabulary/minna-no-nihongo/lesson/51")).toBeNull()
  })
})
