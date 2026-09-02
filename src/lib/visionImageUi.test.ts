import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const imagePreview = readFileSync(new URL("../components/shared/ImagePreview.tsx", import.meta.url), "utf8")
const commons = readFileSync(new URL("../components/learning/CourseCommonsPanel.tsx", import.meta.url), "utf8")
const chat = readFileSync(new URL("../components/chat/ChatAttachment.tsx", import.meta.url), "utf8")
const lesson = readFileSync(new URL("../components/learning/JapaneseLessonWorkspace.tsx", import.meta.url), "utf8")
const review = readFileSync(new URL("../components/learning/VocabularyImageImportSheet.tsx", import.meta.url), "utf8")

describe("Vision Learning image UI", () => {
  it("reuses one responsive image preview with lazy loading, retry and full-screen safe areas", () => { expect(imagePreview).toContain('loading="lazy"'); expect(imagePreview).toContain("setReloadKey"); expect(imagePreview).toContain("safe-area-inset-bottom"); expect(commons).toContain("<ImagePreview"); expect(chat).toContain("<ImagePreview") })
  it("uses editorial one-image and dense multi-image layouts with a bounded feed preview", () => { expect(commons).toContain("grid-flow-dense"); expect(commons).toContain("slice(0, detail ? 8 : 4)"); expect(commons).toContain("+{images.length - visible.length}") })
  it("keeps the lesson image-import entry visible and the review sheet mobile-safe", () => { expect(lesson).toContain('t("vocabulary.imageImport")'); expect(review).toContain('capture="environment"'); expect(review).toContain("overflow-y-auto"); expect(review).toContain("safe-area-inset-bottom") })
  it("requires review and selection before batch import", () => { expect(review).toContain('type="checkbox"'); expect(review).toContain("needsConfirmation"); expect(review).toContain("addToLesson") })
  it("restores Review drafts synchronously without a Strict Mode-sensitive attempted guard", () => { expect(review).toContain("resolveVocabularyImageReviewHydration"); expect(review).toContain("hydration.noticeKey"); expect(review).toContain("open || restoredOpen"); expect(review).not.toContain("queueMicrotask"); expect(review).not.toContain("restoredContextKey") })
  it("clears Review drafts only after import, cancel, or logout", () => { expect(review).toContain("clearVocabularyImageReviewDraft"); expect(review).toContain("cancelImport") })
})
