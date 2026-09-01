import { describe, expect, it, vi } from "vitest"

import { getVocabularySpeechLanguage, getVocabularySpeechText, playVocabularyWord, stopVocabularySpeech, type SpeechAdapter } from "@/lib/speechManager"

const japanese = { term: "勉強", reading: "べんきょう", language: "ja-JP" as const }

describe("vocabulary speech manager", () => {
  it("uses Japanese reading and language metadata", () => {
    expect(getVocabularySpeechText(japanese)).toBe("べんきょう")
    expect(getVocabularySpeechLanguage(japanese)).toBe("ja-JP")
  })

  it("uses English language metadata without hard-coding all words to English", () => {
    expect(getVocabularySpeechLanguage({ term: "effort", language: "en-GB" })).toBe("en-GB")
  })

  it("cancels the previous utterance before rapid playback", () => {
    const first: SpeechAdapter = { supported: true, cancel: vi.fn(), speak: vi.fn() }
    const second: SpeechAdapter = { supported: true, cancel: vi.fn(), speak: vi.fn() }
    playVocabularyWord(japanese, {}, first)
    playVocabularyWord({ term: "effort", reading: null, language: "en-US" }, {}, second)
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
