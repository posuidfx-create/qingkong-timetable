import { describe, expect, it, vi } from "vitest"

import { buildLearningCourseIndex, buildLearningKnowledge, buildTimetableCourseOptions, getCourseAnalysisQueue, getRecordCourseKey, runCourseAnalysisQueue, searchLearningLibrary, UNCLASSIFIED_COURSE_KEY } from "@/lib/learningLibrary"
import type { LearningAsset, LearningRecord } from "@/types/learning"
import type { Course } from "@/types/timetable"

const course = (id: string, name: string): Course => ({ id, name, dayOfWeek: 1, startSection: 1, endSection: 2, weeks: [1], color: "" })
const asset = (overrides: Partial<LearningAsset> = {}): LearningAsset => ({ id: "a1", recordId: "r1", userId: "u1", type: "image", originalName: "lecture.png", mimeType: "image/png", fileSize: 100, storageBucket: "b", storagePath: "p", sortOrder: 0, processingStatus: "completed", extractedText: null, analysis: { version: 1, summary: "极限与连续", keyPoints: ["极限定义"], contentType: "note", language: "zh", suggestedReview: "复习洛必达法则", warnings: [] }, createdAt: "2026-09-01" , ...overrides })
const record = (overrides: Partial<LearningRecord> = {}): LearningRecord => ({ id: "r1", userId: "u1", recordDate: "2026-09-01", title: "课堂笔记", courseName: "高等数学", courseKey: null, type: "class", content: "连续函数", moodNote: null, processingStatus: "uploaded", analysis: null, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", assets: [asset()], ...overrides })

describe("learning course library", () => {
  it("turns every timetable course into a deduplicated course option", () => {
    const options = buildTimetableCourseOptions([course("c1", "高等数学"), course("c2", "高等数学"), course("c3", "Java")])
    expect(options).toHaveLength(2)
    expect(new Set(options.map((item) => item.name))).toEqual(new Set(["Java", "高等数学"]))
  })

  it("merges current courses, keyed history, snapshot history, and unclassified records", () => {
    const current = [course("c1", "高等数学"), course("c2", "Java")]
    const records = [record(), record({ id: "r2", courseName: "旧课程", courseKey: "legacy-key" }), record({ id: "r3", courseName: "历史设计", courseKey: null }), record({ id: "r4", courseName: null, courseKey: null })]
    const index = buildLearningCourseIndex(current, records)
    expect(index.some((item) => item.name === "Java" && item.records.length === 0)).toBe(true)
    expect(index.some((item) => item.key === "legacy-key" && !item.current)).toBe(true)
    expect(index.some((item) => item.name === "历史设计" && !item.current)).toBe(true)
    expect(index.find((item) => item.key === UNCLASSIFIED_COURSE_KEY)?.records).toHaveLength(1)
    expect(getRecordCourseKey(records[0], index)).toBe(index.find((item) => item.name === "高等数学")?.key)
  })

  it("builds traceable text and AI knowledge without exposing raw JSON", () => {
    const items = buildLearningKnowledge([record()])
    expect(items.map((item) => item.kind)).toEqual(["note", "summary", "keyPoint", "review"])
    expect(items.find((item) => item.kind === "keyPoint")?.source).toBe("lecture.png")
  })

  it("searches course, title, content, filename, summary, and key points", () => {
    const withRecordAnalysis = record({ analysis: { version: 1, summary: "函数收敛总结", keyPoints: ["一致连续"], contentType: "note", language: "zh", suggestedReview: "复习闭区间定理", warnings: [] } })
    const index = buildLearningCourseIndex([course("c1", "高等数学")], [withRecordAnalysis])
    for (const query of ["高等数学", "课堂笔记", "连续函数", "lecture.png", "极限与连续", "极限定义", "函数收敛总结", "一致连续", "闭区间定理"]) expect(searchLearningLibrary(index, query).length).toBeGreaterThan(0)
  })

  it("queues text records and preserves partial failures with concurrency two", async () => {
    const pending = record({ id: "pending", assets: [asset({ processingStatus: "uploaded" })] })
    const failed = record({ id: "failed", assets: [asset({ id: "a2", processingStatus: "failed" })] })
    const complete = record({ id: "complete", processingStatus: "completed" })
    const unsupported = record({ id: "audio", assets: [asset({ id: "a3", type: "audio", mimeType: "audio/mpeg", processingStatus: "uploaded" })] })
    expect(getCourseAnalysisQueue([pending, failed, complete, unsupported]).map((item) => item.id)).toEqual(["pending", "failed", "audio"])
    const progress = vi.fn()
    const result = await runCourseAnalysisQueue([pending, failed], async (item) => { if (item.id === "failed") throw new Error("failed") }, progress, 2)
    expect(result).toEqual({ completed: 1, failed: 1, processed: 2, total: 2 })
    expect(progress).toHaveBeenCalledTimes(2)
  })
})
