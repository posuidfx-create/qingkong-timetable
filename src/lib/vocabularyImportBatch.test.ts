import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/vocabularyService", () => ({ deleteVocabularyWord: vi.fn() }))

import { clearVocabularyImportBatch, loadVocabularyImportBatch, saveVocabularyImportBatch, undoVocabularyImportBatch } from "@/lib/vocabularyImportBatch"
import type { VocabularyWord } from "@/types/vocabulary"

class MemoryStorage { private readonly values = new Map<string, string>(); get length() { return this.values.size } getItem(key: string) { return this.values.get(key) ?? null } setItem(key: string, value: string) { this.values.set(key, value) } removeItem(key: string) { this.values.delete(key) } key(index: number) { return [...this.values.keys()][index] ?? null } }
const context = { userId: "user-a", lessonNumber: 39, volume: "beginner_2" as const }
const word = (id: string, patch: Partial<VocabularyWord> = {}): VocabularyWord => ({ id, userId: "user-a", term: id, language: "ja-JP", reading: null, meaning: null, notes: null, courseName: "大家的日语", courseKey: "minna_no_nihongo", textbookKey: "minna_no_nihongo", volume: "beginner_2", lessonNumber: 39, mastery: "new", analysisStatus: "uploaded", analysis: null, createdAt: "", updatedAt: "", ...patch })

describe("Vocabulary image import batch", () => {
  it("persists only the exact newly-created ids and can clear the batch", () => {
    const storage = new MemoryStorage(); const batch = saveVocabularyImportBatch(context, [word("new-1"), word("new-2")], storage)
    expect(loadVocabularyImportBatch(context, storage)?.createdWordIds).toEqual(["new-1", "new-2"])
    expect(JSON.stringify(batch)).not.toMatch(/notes|mastery|analysis|meaning/)
    clearVocabularyImportBatch(context, storage); expect(loadVocabularyImportBatch(context, storage)).toBeNull()
  })

  it("undoes only words newly inserted by the batch", async () => {
    const storage = new MemoryStorage(); const created = word("new-1"); const existing = word("old-1"); const batch = saveVocabularyImportBatch(context, [created], storage)!; const remove = vi.fn().mockResolvedValue(undefined)
    const result = await undoVocabularyImportBatch(batch, [created, existing], remove)
    expect(result.deleted).toEqual([created]); expect(remove).toHaveBeenCalledTimes(1); expect(remove).not.toHaveBeenCalledWith(existing)
  })

  it("never deletes cross-user or cross-lesson words even if an id is injected", async () => {
    const storage = new MemoryStorage(); const batch = saveVocabularyImportBatch(context, [word("new-1")], storage)!; batch.createdWordIds.push("other-user", "other-lesson"); const remove = vi.fn().mockResolvedValue(undefined)
    await undoVocabularyImportBatch(batch, [word("other-user", { userId: "user-b" }), word("other-lesson", { lessonNumber: 38 })], remove)
    expect(remove).not.toHaveBeenCalled()
  })
})
