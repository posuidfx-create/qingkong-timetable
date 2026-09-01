import { detectVocabularyLanguage } from "@/lib/vocabulary"
import type { VocabularyLanguage, VocabularyWord } from "@/types/vocabulary"

export interface SpeechRequest {
  text: string
  lang: VocabularyLanguage
  rate: number
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
}
export interface SpeechAdapter {
  cancel: () => void
  speak: (request: SpeechRequest) => void
  supported: boolean
}

function browserSpeechAdapter(): SpeechAdapter {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined"
  return {
    supported,
    cancel: () => { if (supported) window.speechSynthesis.cancel() },
    speak: (request) => {
      if (!supported) return
      const utterance = new SpeechSynthesisUtterance(request.text)
      utterance.lang = request.lang
      utterance.rate = request.rate
      utterance.onstart = () => request.onStart?.()
      utterance.onend = () => request.onEnd?.()
      utterance.onerror = () => request.onError?.()
      window.speechSynthesis.speak(utterance)
    },
  }
}

let activeAdapter: SpeechAdapter | null = null

export function getVocabularySpeechText(word: Pick<VocabularyWord, "term" | "reading" | "language">): string {
  return word.language === "ja-JP" && word.reading?.trim() ? word.reading.trim() : word.term.trim()
}

export function getVocabularySpeechLanguage(word: Pick<VocabularyWord, "term" | "language">): VocabularyLanguage {
  return word.language || detectVocabularyLanguage(word.term)
}

export function playVocabularyWord(
  word: Pick<VocabularyWord, "term" | "reading" | "language">,
  callbacks: Pick<SpeechRequest, "onStart" | "onEnd" | "onError"> = {},
  adapter: SpeechAdapter = browserSpeechAdapter(),
): boolean {
  activeAdapter?.cancel()
  activeAdapter = adapter
  if (!adapter.supported) { callbacks.onError?.(); return false }
  adapter.speak({ text: getVocabularySpeechText(word), lang: getVocabularySpeechLanguage(word), rate: word.language === "ja-JP" ? 0.85 : 0.9, ...callbacks })
  return true
}

export function stopVocabularySpeech(adapter?: SpeechAdapter): void {
  ;(adapter ?? activeAdapter)?.cancel()
  activeAdapter = null
}
