import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { LEARNING_AI_ENABLED } from "@/constants/features"
import { getLearningAssetCounts, getLearningRecordHeadline, getRecentLearningRecords, getTodayCourseNames, getTodayLearningRecords, learningIndexItems, learningMorphItems } from "@/lib/learningEditorial"
import type { LearningAsset, LearningRecord } from "@/types/learning"

const imageAsset: LearningAsset = {
  id: "asset-image", recordId: "record-a", userId: "user-a", type: "image", originalName: "note.jpg", mimeType: "image/jpeg", fileSize: 1024,
  storageBucket: "learning-materials-images", storagePath: "learning/user-a/record-a/note.jpg", sortOrder: 0, processingStatus: "uploaded", extractedText: null, analysis: null, createdAt: "2026-09-01T08:00:00Z",
}

function record(overrides: Partial<LearningRecord> = {}): LearningRecord {
  return {
    id: "record-a", userId: "user-a", recordDate: "2026-09-01", title: "课堂笔记", courseName: "综合日语", courseKey: null,
    type: "class", content: "复习了第一课。", moodNote: null, processingStatus: "uploaded", analysis: null, createdAt: "2026-09-01T08:00:00Z", updatedAt: "2026-09-01T08:00:00Z", assets: [], ...overrides,
  }
}

describe("learning editorial presentation", () => {
  it("derives Today from real record dates and courses", () => {
    const records = [record(), record({ id: "record-b", recordDate: "2026-08-31", courseName: "大学生轨迹" })]
    expect(getTodayLearningRecords(records, "2026-09-01").map((item) => item.id)).toEqual(["record-a"])
    expect(getTodayCourseNames(records, "2026-09-01")).toEqual(["综合日语"])
  })

  it("sorts and limits the recent real records", () => {
    const records = [record({ id: "older", recordDate: "2026-08-30" }), record({ id: "newer", recordDate: "2026-09-01" })]
    expect(getRecentLearningRecords(records, 1).map((item) => item.id)).toEqual(["newer"])
  })

  it("does not invent a title for an attachment-only record", () => {
    expect(getLearningRecordHeadline(record({ title: null, content: null, moodNote: null, assets: [imageAsset] }))).toBeNull()
  })

  it("uses truthful attachment counts for archive metadata", () => {
    const pdfAsset = { ...imageAsset, id: "asset-pdf", type: "document" as const, originalName: "lesson.pdf", mimeType: "application/pdf" }
    expect(getLearningAssetCounts(record({ assets: [imageAsset, pdfAsset] }))).toEqual({ audio: 0, document: 0, image: 1, pdf: 1, total: 2 })
  })

  it("keeps five Index entries and real morph active targets", () => {
    expect(learningIndexItems).toHaveLength(5)
    expect(learningMorphItems.find((item) => item.view === "timeline")?.titleKey).toBe("learning.records")
  })

  it("renders the morph active-state contract", () => {
    const source = readFileSync(new URL("../components/learning/LearningMorphNavigation.tsx", import.meta.url), "utf8")
    expect(source).toContain('aria-current={active ? "page" : undefined}')
    expect(source).toContain("data-active={active}")
  })

  it("keeps AI controls disabled when the feature flag is absent", () => {
    expect(LEARNING_AI_ENABLED).toBe(false)
  })

  it("wires the primary CTA and empty state without changing CRUD", () => {
    const source = readFileSync(new URL("../pages/LearningPage.tsx", import.meta.url), "utf8")
    expect(source).toContain("<ReactiveSurfaceButton")
    expect(source).toContain("onClick={openNew}")
    expect(source).toContain("learning.emptyHint")
    expect(source).toContain("LEARNING_AI_ENABLED ? <LearningAssetAnalysis")
  })

  it("uses a pixel reactive surface without React pointer state", () => {
    const source = readFileSync(new URL("../components/learning/ReactiveSurfaceButton.tsx", import.meta.url), "utf8")
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8")
    expect(source).toContain("data-pixel-cell")
    expect(source).toContain("requestAnimationFrame")
    expect(source).not.toContain("useState")
    expect(css).toContain(".learning-reactive-surface:hover .learning-reactive-surface__pixels > i")
    expect(css).toContain(".learning-reactive-surface:active")
  })

  it("defines a mobile reading plane and desktop context rail", () => {
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8")
    expect(css).toContain(".learning-context-rail { display: none; }")
    expect(css).toContain("@media (min-width: 64rem)")
    expect(css).toContain(".learning-context-rail { display: block; }")
    expect(css).toContain(".learning-reading-plane")
  })

  it("keeps core editorial copy aligned in Chinese and Japanese", async () => {
    const { zhCN } = await import("@/i18n/translations.zh-CN")
    const { jaJP } = await import("@/i18n/translations.ja-JP")
    expect(zhCN["learning.recordToday"]).toBe("记录今天")
    expect(jaJP["learning.recordToday"]).toBe("今日を記録")
    expect(zhCN["learning.recentLearning"]).toBe("最近学习")
    expect(jaJP["learning.recentLearning"]).toBe("最近の学び")
  })
})
