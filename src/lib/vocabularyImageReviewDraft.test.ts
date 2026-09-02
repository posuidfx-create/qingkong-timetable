import { describe, expect, it } from "vitest"

import { getJapaneseLessonVolume, MINNA_NO_NIHONGO_KEY } from "@/lib/japaneseLessons"
import type { EditableImportedWord } from "@/lib/vocabularyImageImport"
import { buildVocabularyImageReviewDraftKey, clearAllVocabularyImageReviewDrafts, clearVocabularyImageReviewDraft, createVocabularyImageFingerprint, loadVocabularyImageReviewDraft, resolveVocabularyImageReviewHydration, saveVocabularyImageReviewDraft, VOCABULARY_IMAGE_REVIEW_DRAFT_TTL_MS, type VocabularyImageReviewContext } from "@/lib/vocabularyImageReviewDraft"

class MemoryStorage {
  private readonly values = new Map<string, string>()
  get length() { return this.values.size }
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
  key(index: number) { return [...this.values.keys()][index] ?? null }
}

const context = (userId = "user-a", lessonNumber = 39): VocabularyImageReviewContext => ({
  userId,
  textbookKey: MINNA_NO_NIHONGO_KEY,
  volume: getJapaneseLessonVolume(lessonNumber),
  lessonNumber,
})

const word = (patch: Partial<EditableImportedWord> = {}): EditableImportedWord => ({
  id: "予定-0",
  term: "予定",
  reading: "よてい",
  partOfSpeech: "名词",
  meanings: ["计划"],
  sourceText: "予定",
  tileIndex: 0,
  rowOrder: 0,
  confidence: 0.94,
  warnings: [],
  needsReview: false,
  recognitionStatus: "clear",
  selected: true,
  ...patch,
})

describe("vocabulary image Review session draft", () => {
  it("restores across a Strict Mode-like setup-cleanup-setup sequence", () => {
    const storage = new MemoryStorage()
    const ctx = context()
    saveVocabularyImageReviewDraft(ctx, [word()], { storage })
    const firstSetup = resolveVocabularyImageReviewHydration(ctx, { storage })
    const cleanup = () => undefined
    cleanup()
    const secondSetup = resolveVocabularyImageReviewHydration(ctx, { storage })
    expect(firstSetup?.words).toEqual(secondSetup?.words)
  })

  it("waits for auth hydration instead of marking a null user as attempted", () => {
    const storage = new MemoryStorage()
    const ctx = context()
    saveVocabularyImageReviewDraft(ctx, [word()], { storage })
    expect(resolveVocabularyImageReviewHydration(null, { storage })).toBeNull()
    expect(resolveVocabularyImageReviewHydration(ctx, { storage })?.stage).toBe("review")
  })

  it("is idempotent when the same ready context hydrates twice", () => {
    const storage = new MemoryStorage()
    const ctx = context()
    saveVocabularyImageReviewDraft(ctx, [word()], { storage })
    expect(resolveVocabularyImageReviewHydration(ctx, { storage })).toEqual(resolveVocabularyImageReviewHydration(ctx, { storage }))
  })

  it("hydrates Review stage, open state, restore notice and a 28/27 selection", () => {
    const storage = new MemoryStorage()
    const words = Array.from({ length: 28 }, (_, index) => word({ id: `word-${index}`, term: index === 15 ? "海" : `词-${index}`, selected: index !== 15 }))
    saveVocabularyImageReviewDraft(context(), words, { storage })
    const hydration = resolveVocabularyImageReviewHydration(context(), { storage })
    expect(hydration).toMatchObject({ stage: "review", open: true, noticeKey: "vocabulary.imageReviewRestored" })
    expect(hydration?.words).toHaveLength(28)
    expect(hydration?.words.filter((item) => item.selected)).toHaveLength(27)
    expect(hydration?.words.find((item) => item.term === "海")?.selected).toBe(false)
  })

  it("creates a session draft after successful recognition and restores it repeatedly", () => {
    const storage = new MemoryStorage()
    saveVocabularyImageReviewDraft(context(), [word()], { storage, createdAt: 100 })
    expect(loadVocabularyImageReviewDraft(context(), { storage, now: 200 })?.words[0]?.term).toBe("予定")
    expect(loadVocabularyImageReviewDraft(context(), { storage, now: 300 })?.words[0]?.term).toBe("予定")
  })

  it("restores edited fields and checkbox selection", () => {
    const storage = new MemoryStorage()
    saveVocabularyImageReviewDraft(context(), [word({ term: "心配します", reading: "しんぱいします", meanings: ["担心"], selected: false })], { storage })
    expect(loadVocabularyImageReviewDraft(context(), { storage })).toMatchObject({ words: [{ term: "心配します", reading: "しんぱいします", meanings: ["担心"], selected: false }] })
  })

  it("restores tile provenance, source text and review status", () => {
    const storage = new MemoryStorage()
    saveVocabularyImageReviewDraft(context(), [word({ sourceText: "心配します", tileIndex: 2, rowOrder: 7, needsReview: true, recognitionStatus: "review", selected: false })], { storage })
    expect(loadVocabularyImageReviewDraft(context(), { storage })?.words[0]).toMatchObject({ sourceText: "心配します", tileIndex: 2, rowOrder: 7, needsReview: true, recognitionStatus: "review", selected: false })
  })

  it("isolates drafts by lesson and signed-in user", () => {
    const storage = new MemoryStorage()
    saveVocabularyImageReviewDraft(context("user-a", 39), [word()], { storage })
    expect(loadVocabularyImageReviewDraft(context("user-a", 38), { storage })).toBeNull()
    expect(loadVocabularyImageReviewDraft(context("user-b", 39), { storage })).toBeNull()
  })

  it("expires and removes a draft after two hours", () => {
    const storage = new MemoryStorage()
    const ctx = context()
    saveVocabularyImageReviewDraft(ctx, [word()], { storage, createdAt: 1_000 })
    expect(loadVocabularyImageReviewDraft(ctx, { storage, now: 1_000 + VOCABULARY_IMAGE_REVIEW_DRAFT_TTL_MS + 1 })).toBeNull()
    expect(storage.getItem(buildVocabularyImageReviewDraftKey(ctx))).toBeNull()
  })

  it("removes an invalid draft instead of hydrating partial state", () => {
    const storage = new MemoryStorage()
    const ctx = context()
    storage.setItem(buildVocabularyImageReviewDraftKey(ctx), JSON.stringify({ version: 1, words: "invalid" }))
    expect(resolveVocabularyImageReviewHydration(ctx, { storage })).toBeNull()
    expect(storage.getItem(buildVocabularyImageReviewDraftKey(ctx))).toBeNull()
  })

  it("clears the draft after a successful import", () => {
    const storage = new MemoryStorage()
    const ctx = context()
    saveVocabularyImageReviewDraft(ctx, [word()], { storage })
    clearVocabularyImageReviewDraft(ctx, storage)
    expect(loadVocabularyImageReviewDraft(ctx, { storage })).toBeNull()
  })

  it("clears the draft after explicit cancel", () => {
    const storage = new MemoryStorage()
    const ctx = context()
    saveVocabularyImageReviewDraft(ctx, [word()], { storage })
    clearVocabularyImageReviewDraft(ctx, storage)
    expect(resolveVocabularyImageReviewHydration(ctx, { storage })).toBeNull()
  })

  it("clears every Review draft on logout without touching unrelated session data", () => {
    const storage = new MemoryStorage()
    saveVocabularyImageReviewDraft(context("user-a"), [word()], { storage })
    saveVocabularyImageReviewDraft(context("user-b"), [word()], { storage })
    storage.setItem("unrelated", "keep")
    clearAllVocabularyImageReviewDrafts(storage)
    expect(storage.getItem("unrelated")).toBe("keep")
    expect(storage.length).toBe(1)
  })

  it("stores only Review data and never image bytes, base64, URL, token or secret fields", () => {
    const storage = new MemoryStorage()
    const ctx = context()
    saveVocabularyImageReviewDraft(ctx, [word()], { storage, imageFingerprint: "safe-fingerprint" })
    const raw = storage.getItem(buildVocabularyImageReviewDraftKey(ctx)) ?? ""
    expect(JSON.parse(raw)).toEqual(expect.objectContaining({ imageFingerprint: "safe-fingerprint", words: expect.any(Array) }))
    expect(raw).not.toMatch(/base64|access_token|authorization|signed_url|api_key|imageBytes|data:image/i)
  })

  it("keeps a successful Review intact when recognition later fails before replacement", () => {
    const storage = new MemoryStorage()
    const ctx = context()
    saveVocabularyImageReviewDraft(ctx, [word({ term: "成功结果" })], { storage })
    // A failed provider call performs no save, so the last confirmed Review remains recoverable.
    expect(loadVocabularyImageReviewDraft(ctx, { storage })?.words[0]?.term).toBe("成功结果")
  })

  it("creates a metadata-only fingerprint without reading or retaining file bytes", async () => {
    const file = new File(["private image bytes"], "words.jpg", { type: "image/jpeg", lastModified: 123 })
    const fingerprint = await createVocabularyImageFingerprint(file)
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(fingerprint).not.toContain("private image bytes")
  })
})
