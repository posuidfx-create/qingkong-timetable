import { describe, expect, it, vi } from "vitest"

import { LearningDraftPreviewStore, learningDraftFilesForUpload } from "@/lib/learningPreview"
import type { LearningAssetDraft } from "@/types/learning"

function draft(type: LearningAssetDraft["type"] = "image"): LearningAssetDraft {
  const file = new File(["preview"], type === "image" ? "note.png" : "note.pdf", { type: type === "image" ? "image/png" : "application/pdf" })
  return { file, type, name: file.name, mime: file.type, size: file.size }
}

describe("learning draft preview URLs", () => {
  it("creates one stable preview URL when an image enters the draft", () => {
    const createObjectURL = vi.fn(() => "blob:note")
    const store = new LearningDraftPreviewStore({ createObjectURL, revokeObjectURL: vi.fn() })
    const file = store.create(draft())
    expect(file.previewUrl).toBe("blob:note")
    expect(file.previewUrl).toBe("blob:note")
    expect(createObjectURL).toHaveBeenCalledOnce()
  })

  it("does not create an Object URL for non-image upload files", () => {
    const createObjectURL = vi.fn(() => "blob:unused")
    const store = new LearningDraftPreviewStore({ createObjectURL, revokeObjectURL: vi.fn() })
    expect(store.create(draft("document")).previewUrl).toBeNull()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it("revokes a removed draft exactly once", () => {
    const revokeObjectURL = vi.fn()
    const store = new LearningDraftPreviewStore({ createObjectURL: () => "blob:removed", revokeObjectURL })
    const file = store.create(draft())
    store.release(file)
    store.release(file)
    expect(revokeObjectURL).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:removed")
  })

  it("revokes every remaining preview when the form unmounts", () => {
    const revokeObjectURL = vi.fn()
    const store = new LearningDraftPreviewStore({ createObjectURL: (file) => `blob:${file.name}`, revokeObjectURL })
    store.create(draft())
    store.create({ ...draft(), file: new File(["second"], "second.png", { type: "image/png" }), name: "second.png" })
    store.releaseAll()
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  it("keeps the original File for upload and attachment-only records", () => {
    const revokeObjectURL = vi.fn()
    const store = new LearningDraftPreviewStore({ createObjectURL: () => "blob:upload", revokeObjectURL })
    const file = store.create(draft())
    expect(learningDraftFilesForUpload([file])).toEqual([file.draft.file])
    expect(revokeObjectURL).not.toHaveBeenCalled()
    store.releaseAll()
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:upload")
  })
})
