import { describe, expect, it, vi } from "vitest"

import {
  executeVocabularyBulkDelete,
  reconcileVocabularySelection,
  selectAllVisibleVocabularyWords,
  toggleVocabularySelection,
  uniqueVocabularyWordIds,
  VOCABULARY_DELETE_CHUNK_SIZE,
} from "@/lib/vocabularyBulkDelete"

describe("vocabulary bulk selection", () => {
  it("toggles one word without mutating the previous selection", () => {
    const previous = new Set(["word-a"])
    const selected = toggleVocabularySelection(previous, "word-b")
    const cleared = toggleVocabularySelection(selected, "word-a")

    expect([...previous]).toEqual(["word-a"])
    expect([...selected]).toEqual(["word-a", "word-b"])
    expect([...cleared]).toEqual(["word-b"])
  })

  it("selects only the currently visible filtered results", () => {
    expect([...selectAllVisibleVocabularyWords(["visible-a", "visible-b"])]).toEqual(["visible-a", "visible-b"])
  })

  it("removes hidden results when search or lesson scope changes", () => {
    expect([...reconcileVocabularySelection(new Set(["visible", "hidden"]), ["visible"])]).toEqual(["visible"])
  })

  it("normalizes duplicate and empty ids", () => {
    expect(uniqueVocabularyWordIds([" a ", "a", "", "b"])).toEqual(["a", "b"])
  })
})

describe("vocabulary bulk delete execution", () => {
  it("uses chunks of 50 and never submits unselected ids", async () => {
    const ids = Array.from({ length: 120 }, (_, index) => `word-${index}`)
    const deleteChunk = vi.fn(async (chunk: readonly string[]) => chunk)

    const result = await executeVocabularyBulkDelete(ids, deleteChunk)

    expect(VOCABULARY_DELETE_CHUNK_SIZE).toBe(50)
    expect(deleteChunk.mock.calls.map(([chunk]) => chunk.length)).toEqual([50, 50, 20])
    expect(result.deletedIds).toEqual(ids)
    expect(result.failedIds).toEqual([])
  })

  it("keeps ids omitted by the database response as failed", async () => {
    const result = await executeVocabularyBulkDelete(["a", "b", "c"], async () => ["a", "c"])
    expect(result).toEqual({ deletedIds: ["a", "c"], failedIds: ["b"] })
  })

  it("keeps a failed chunk for retry while preserving successful chunks", async () => {
    const ids = Array.from({ length: 55 }, (_, index) => `word-${index}`)
    let call = 0
    const result = await executeVocabularyBulkDelete(ids, async (chunk) => {
      call += 1
      if (call === 2) throw new Error("network")
      return chunk
    })

    expect(result.deletedIds).toEqual(ids.slice(0, 50))
    expect(result.failedIds).toEqual(ids.slice(50))
  })

  it("does not issue a delete call for an empty selection", async () => {
    const deleteChunk = vi.fn()
    expect(await executeVocabularyBulkDelete([], deleteChunk)).toEqual({ deletedIds: [], failedIds: [] })
    expect(deleteChunk).not.toHaveBeenCalled()
  })
})
