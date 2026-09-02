import { deleteVocabularyWord } from "@/lib/vocabularyService"
import type { VocabularyWord } from "@/types/vocabulary"

export const VOCABULARY_IMPORT_BATCH_TTL_MS = 2 * 60 * 60 * 1_000
const PREFIX = "vocabulary-image-batch:v1:"

export interface VocabularyImportBatchContext { userId: string; lessonNumber: number; volume: "beginner_1" | "beginner_2" }
export interface VocabularyImportBatch { version: 1; id: string; userId: string; lessonNumber: number; volume: "beginner_1" | "beginner_2"; createdWordIds: string[]; createdAt: number }
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">

const currentStorage = (): StorageLike | null => typeof window === "undefined" ? null : window.sessionStorage
export const vocabularyImportBatchKey = (context: VocabularyImportBatchContext) => `${PREFIX}${context.userId}:${context.volume}:${context.lessonNumber}`

export function saveVocabularyImportBatch(context: VocabularyImportBatchContext, words: readonly VocabularyWord[], storage: StorageLike | null = currentStorage()): VocabularyImportBatch | null {
  if (!storage || !words.length) return null
  const batch: VocabularyImportBatch = { version: 1, id: crypto.randomUUID(), ...context, createdWordIds: words.map((word) => word.id), createdAt: Date.now() }
  storage.setItem(vocabularyImportBatchKey(context), JSON.stringify(batch))
  return batch
}

export function loadVocabularyImportBatch(context: VocabularyImportBatchContext, storage: StorageLike | null = currentStorage(), now = Date.now()): VocabularyImportBatch | null {
  const key = vocabularyImportBatchKey(context); const raw = storage?.getItem(key)
  if (!raw || !storage) return null
  try {
    const value = JSON.parse(raw) as Partial<VocabularyImportBatch>
    if (value.version !== 1 || value.userId !== context.userId || value.lessonNumber !== context.lessonNumber || value.volume !== context.volume || !Array.isArray(value.createdWordIds) || value.createdWordIds.some((id) => typeof id !== "string") || typeof value.createdAt !== "number" || now - value.createdAt > VOCABULARY_IMPORT_BATCH_TTL_MS || typeof value.id !== "string") { storage.removeItem(key); return null }
    return value as VocabularyImportBatch
  } catch { storage.removeItem(key); return null }
}

export function clearVocabularyImportBatch(context: VocabularyImportBatchContext, storage: StorageLike | null = currentStorage()): void { storage?.removeItem(vocabularyImportBatchKey(context)) }
export function clearAllVocabularyImportBatches(storage: StorageLike | null = currentStorage()): void { if (!storage) return; Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => Boolean(key?.startsWith(PREFIX))).forEach((key) => storage.removeItem(key)) }

export async function undoVocabularyImportBatch(batch: VocabularyImportBatch, words: readonly VocabularyWord[], remove: (word: VocabularyWord) => Promise<void> = deleteVocabularyWord): Promise<{ deleted: VocabularyWord[]; failed: VocabularyWord[] }> {
  const ids = new Set(batch.createdWordIds)
  const targets = words.filter((word) => ids.has(word.id) && word.userId === batch.userId && word.lessonNumber === batch.lessonNumber && word.volume === batch.volume)
  const deleted: VocabularyWord[] = []; const failed: VocabularyWord[] = []
  for (const word of targets) { try { await remove(word); deleted.push(word) } catch { failed.push(word) } }
  return { deleted, failed }
}
