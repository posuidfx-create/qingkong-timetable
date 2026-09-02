import { getJapaneseLessonVolume, MINNA_NO_NIHONGO_KEY } from "@/lib/japaneseLessons"
import type { EditableImportedWord } from "@/lib/vocabularyImageImport"
import type { JapaneseTextbookVolume } from "@/types/vocabulary"

export const VOCABULARY_IMAGE_REVIEW_DRAFT_TTL_MS = 2 * 60 * 60 * 1_000
const STORAGE_PREFIX = "vocabulary-image-review:v1:"

export interface VocabularyImageReviewContext {
  userId: string
  textbookKey: typeof MINNA_NO_NIHONGO_KEY
  volume: JapaneseTextbookVolume
  lessonNumber: number
}

export interface VocabularyImageReviewDraft {
  version: 1
  textbookKey: typeof MINNA_NO_NIHONGO_KEY
  volume: JapaneseTextbookVolume
  lessonNumber: number
  words: EditableImportedWord[]
  createdAt: number
  imageFingerprint: string | null
}

export interface VocabularyImageReviewHydration {
  draft: VocabularyImageReviewDraft
  words: EditableImportedWord[]
  stage: "review"
  open: true
  noticeKey: "vocabulary.imageReviewRestored"
}

type SessionStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">

function currentStorage(): SessionStorageLike | null {
  return typeof window === "undefined" ? null : window.sessionStorage
}

export function buildVocabularyImageReviewDraftKey(context: VocabularyImageReviewContext): string {
  return `${STORAGE_PREFIX}${context.userId}:${context.textbookKey}:${context.volume}:${context.lessonNumber}`
}

function parseStringList(value: unknown, maxItems: number, maxLength: number): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null
  const values = value.map((item) => typeof item === "string" ? item.slice(0, maxLength) : null)
  return values.every((item): item is string => item !== null) ? values : null
}

function parseWord(value: unknown): EditableImportedWord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const meanings = parseStringList(row.meanings, 8, 300)
  const warnings = parseStringList(row.warnings, 5, 300)
  if (
    typeof row.id !== "string" || row.id.length > 240
    || typeof row.term !== "string" || !row.term.trim() || row.term.length > 160
    || typeof row.reading !== "string" || row.reading.length > 160
    || typeof row.partOfSpeech !== "string" || row.partOfSpeech.length > 80
    || typeof row.sourceText !== "string" || row.sourceText.length > 500
    || typeof row.tileIndex !== "number" || !Number.isInteger(row.tileIndex) || row.tileIndex < 0 || row.tileIndex > 5
    || typeof row.rowOrder !== "number" || !Number.isInteger(row.rowOrder) || row.rowOrder < 0
    || typeof row.confidence !== "number" || !Number.isFinite(row.confidence) || row.confidence < 0 || row.confidence > 1
    || typeof row.needsReview !== "boolean" || !["clear", "review", "unconfirmed"].includes(String(row.recognitionStatus))
    || typeof row.selected !== "boolean" || !meanings || !warnings
  ) return null
  return { id: row.id, term: row.term, reading: row.reading, partOfSpeech: row.partOfSpeech, meanings, sourceText: row.sourceText, tileIndex: row.tileIndex, rowOrder: row.rowOrder, confidence: row.confidence, warnings, needsReview: row.needsReview, recognitionStatus: row.recognitionStatus as EditableImportedWord["recognitionStatus"], selected: row.selected }
}

function parseDraft(value: unknown, context: VocabularyImageReviewContext): VocabularyImageReviewDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (
    row.version !== 1 || row.textbookKey !== context.textbookKey || row.volume !== context.volume
    || row.lessonNumber !== context.lessonNumber || context.volume !== getJapaneseLessonVolume(context.lessonNumber)
    || typeof row.createdAt !== "number" || !Number.isFinite(row.createdAt)
    || !(row.imageFingerprint === null || typeof row.imageFingerprint === "string")
    || !Array.isArray(row.words) || row.words.length > 100
  ) return null
  const words = row.words.map(parseWord)
  if (!words.length || words.some((word) => word === null)) return null
  return { version: 1, textbookKey: context.textbookKey, volume: context.volume, lessonNumber: context.lessonNumber, words: words as EditableImportedWord[], createdAt: row.createdAt, imageFingerprint: row.imageFingerprint }
}

export function saveVocabularyImageReviewDraft(
  context: VocabularyImageReviewContext,
  words: readonly EditableImportedWord[],
  options: { createdAt?: number; imageFingerprint?: string | null; storage?: SessionStorageLike | null } = {},
): VocabularyImageReviewDraft | null {
  const storage = options.storage === undefined ? currentStorage() : options.storage
  if (!storage || !context.userId || !words.length) return null
  const draft: VocabularyImageReviewDraft = {
    version: 1,
    textbookKey: context.textbookKey,
    volume: context.volume,
    lessonNumber: context.lessonNumber,
    words: words.map((word) => ({ ...word, meanings: [...word.meanings], warnings: [...word.warnings] })),
    createdAt: options.createdAt ?? Date.now(),
    imageFingerprint: options.imageFingerprint ?? null,
  }
  storage.setItem(buildVocabularyImageReviewDraftKey(context), JSON.stringify(draft))
  return draft
}

export function loadVocabularyImageReviewDraft(
  context: VocabularyImageReviewContext,
  options: { now?: number; storage?: SessionStorageLike | null } = {},
): VocabularyImageReviewDraft | null {
  const storage = options.storage === undefined ? currentStorage() : options.storage
  if (!storage || !context.userId) return null
  const key = buildVocabularyImageReviewDraftKey(context)
  const raw = storage.getItem(key)
  if (!raw) return null
  try {
    const draft = parseDraft(JSON.parse(raw), context)
    if (!draft || (options.now ?? Date.now()) - draft.createdAt > VOCABULARY_IMAGE_REVIEW_DRAFT_TTL_MS) {
      storage.removeItem(key)
      return null
    }
    return draft
  } catch {
    storage.removeItem(key)
    return null
  }
}

export function resolveVocabularyImageReviewHydration(
  context: VocabularyImageReviewContext | null,
  options: { now?: number; storage?: SessionStorageLike | null } = {},
): VocabularyImageReviewHydration | null {
  if (!context) return null
  const draft = loadVocabularyImageReviewDraft(context, options)
  if (!draft) return null
  return {
    draft,
    words: draft.words,
    stage: "review",
    open: true,
    noticeKey: "vocabulary.imageReviewRestored",
  }
}

export function clearVocabularyImageReviewDraft(context: VocabularyImageReviewContext, storage: SessionStorageLike | null = currentStorage()): void {
  storage?.removeItem(buildVocabularyImageReviewDraftKey(context))
}

export function clearAllVocabularyImageReviewDrafts(storage: SessionStorageLike | null = currentStorage()): void {
  if (!storage) return
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => Boolean(key?.startsWith(STORAGE_PREFIX)))
  keys.forEach((key) => storage.removeItem(key))
}

export async function createVocabularyImageFingerprint(file: File): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null
  const metadata = new TextEncoder().encode(`${file.name}\u0000${file.type}\u0000${file.size}\u0000${file.lastModified}`)
  const digest = await globalThis.crypto.subtle.digest("SHA-256", metadata)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}
