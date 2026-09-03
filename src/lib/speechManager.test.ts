import { describe, expect, it, vi } from "vitest"

import { getVocabularySpeechLanguage, getVocabularySpeechText, playVocabularyWord, stopVocabularySpeech, type SpeechAdapter } from "@/lib/speechManager"

const japanese = { term: "勉強", reading: "べんきょう", language: "ja-JP" as const }

describe("vocabulary speech manager", () => {
  it("speaks only the Japanese lexical term with Japanese language metadata", () => {
    const word = { term: "心配します", reading: "しんぱいします", meaning: "担心", language: "ja-JP" as const }
    expect(getVocabularySpeechText(word)).toBe("心配します")
    expect(getVocabularySpeechLanguage(japanese)).toBe("ja-JP")
    expect(getVocabularySpeechText(word)).not.toContain("しんぱいします")
    expect(getVocabularySpeechText(word)).not.toContain("担心")
    expect(getVocabularySpeechText(word)).not.toContain("→")
  })

  it("speaks only English and Chinese terms with their existing locale strategy", () => {
    expect(getVocabularySpeechText({ term: "effort" })).toBe("effort")
    expect(getVocabularySpeechText({ term: "努力" })).toBe("努力")
    expect(getVocabularySpeechLanguage({ term: "effort", language: "en-GB" })).toBe("en-GB")
  })

  it("preserves punctuation that is genuinely part of the stored term", () => {
    expect(getVocabularySpeechText({ term: "おはようございます。" })).toBe("おはようございます。")
  })

  it("passes only term text to the adapter", () => {
    const adapter: SpeechAdapter = { supported: true, cancel: vi.fn(), speak: vi.fn() }
    playVocabularyWord({ term: "心配します", language: "ja-JP" }, {}, adapter)
    expect(adapter.speak).toHaveBeenCalledWith(expect.objectContaining({ text: "心配します", lang: "ja-JP" }))
    expect(JSON.stringify(vi.mocked(adapter.speak).mock.calls)).not.toMatch(/しんぱいします|担心|→/)
  })

  it("cancels the previous utterance before rapid playback", () => {
    const first: SpeechAdapter = { supported: true, cancel: vi.fn(), speak: vi.fn() }
    const second: SpeechAdapter = { supported: true, cancel: vi.fn(), speak: vi.fn() }
    playVocabularyWord(japanese, {}, first)
    playVocabularyWord({ term: "effort", language: "en-US" }, {}, second)
    expect(first.cancel).toHaveBeenCalledTimes(1)
    expect(second.speak).toHaveBeenCalledWith(expect.objectContaining({ text: "effort", lang: "en-US" }))
    stopVocabularySpeech(second)
    expect(second.cancel).toHaveBeenCalledTimes(1)
  })

  it("reports a speech-unavailable fallback", () => {
    const onError = vi.fn()
    expect(playVocabularyWord(japanese, { onError }, { supported: false, cancel: vi.fn(), speak: vi.fn() })).toBe(false)
    expect(onError).toHaveBeenCalledTimes(1)
  })
})
