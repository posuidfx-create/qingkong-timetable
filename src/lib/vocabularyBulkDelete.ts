export const VOCABULARY_DELETE_CHUNK_SIZE = 50

export interface VocabularyBulkDeleteResult {
  deletedIds: string[]
  failedIds: string[]
}

export type VocabularyDeleteChunk = (ids: readonly string[]) => Promise<readonly string[]>

export function uniqueVocabularyWordIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
}

export async function executeVocabularyBulkDelete(
  ids: readonly string[],
  deleteChunk: VocabularyDeleteChunk,
  chunkSize = VOCABULARY_DELETE_CHUNK_SIZE,
): Promise<VocabularyBulkDeleteResult> {
  const pending = uniqueVocabularyWordIds(ids)
  const deleted = new Set<string>()
  const failed = new Set<string>()

  for (let index = 0; index < pending.length; index += chunkSize) {
    const chunk = pending.slice(index, index + chunkSize)
    try {
      const returned = new Set(await deleteChunk(chunk))
      for (const id of chunk) (returned.has(id) ? deleted : failed).add(id)
    } catch {
      chunk.forEach((id) => failed.add(id))
    }
  }

  return { deletedIds: [...deleted], failedIds: [...failed] }
}

export function selectAllVisibleVocabularyWords(visibleIds: readonly string[]): Set<string> {
  return new Set(uniqueVocabularyWordIds(visibleIds))
}

export function reconcileVocabularySelection(selectedIds: ReadonlySet<string>, visibleIds: readonly string[]): Set<string> {
  const visible = new Set(visibleIds)
  return new Set([...selectedIds].filter((id) => visible.has(id)))
}

export function toggleVocabularySelection(selectedIds: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selectedIds)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}
