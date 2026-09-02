import { describe, expect, it } from "vitest"

import { evaluateVocabularyRecognitionAccuracy, evaluateVocabularyRecognitionStability } from "@/lib/vocabularyRecognitionAccuracy"

describe("Vocabulary recognition QA", () => {
  it("reports correct, missed and unexpected terms against human ground truth", () => {
    const result = evaluateVocabularyRecognitionAccuracy(["予定", "場所", "心配します"], ["予定", "場所", "架空語"])
    expect(result).toMatchObject({ expectedCount: 3, actualCount: 3, correctCount: 2, precision: 2 / 3, recall: 2 / 3 })
    expect(result.missedTerms).toEqual(["心配します"])
    expect(result.unexpectedTerms).toEqual(["架空語"])
  })

  it("normalizes harmless spacing and width differences without hiding wrong terms", () => {
    expect(evaluateVocabularyRecognitionAccuracy(["しんぱい します"], ["しんぱいします"]).correctCount).toBe(1)
  })

  it("measures repeat-run stability with deterministic set comparison", () => {
    const result = evaluateVocabularyRecognitionStability([["予定", "場所", "宿題"], ["予定", "場所"], ["場所", "予定", "電話"]])
    expect(result).toEqual({ runCount: 3, commonTerms: ["予定", "場所"], unionCount: 4, stability: .5 })
  })
})
