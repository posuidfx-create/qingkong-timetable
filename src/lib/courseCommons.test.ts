import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase", () => ({ supabase: null }))

import { filterCourseContributions, getCourseCommonsMetrics, getDefaultCourseSharing, parseCourseCommonsAnalysis, parseCourseContribution, resolveSharedAssetIds } from "@/lib/courseCommons"
import type { CourseContribution } from "@/types/courseCommons"

const row = { id: "c1", author_id: "safe-author-id", author_name: "学习者", course_key: "course-1", course_name_snapshot: "大学日语", source_record_id: null, title: "助词整理", content: "は与が的区别", contribution_type: "knowledge", language: "zh-CN", status: "published", ai_summary: "助词摘要", ai_key_points: ["は", "が"], ai_suggested_review: null, published_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z", bookmark_count: "2", bookmarked: false }

describe("Course Commons domain", () => {
  it("parses only the safe public projection", () => { const parsed = parseCourseContribution(row); expect(parsed?.authorName).toBe("学习者"); expect(parsed?.bookmarkCount).toBe(2); expect(parsed).not.toHaveProperty("email") })
  it("searches title, body, AI points, author, and public asset names", () => { const item = { ...parseCourseContribution(row)!, assets: [{ id: "a", contributionId: "c1", fileName: "复习.pdf", mimeType: "application/pdf", fileSize: 10, storageBucket: "course-contributions", storagePath: "course/c1/u/x.pdf", createdAt: "2026-09-01" }] }; expect(filterCourseContributions([item], "复习")).toHaveLength(1); expect(filterCourseContributions([item], "が")).toHaveLength(1); expect(filterCourseContributions([item], "学习者")).toHaveLength(1) })
  it("filters contribution types and counts unique contributors", () => { const first = parseCourseContribution(row)!; const second: CourseContribution = { ...first, id: "c2" }; expect(filterCourseContributions([first, second], "", "note")).toHaveLength(0); expect(getCourseCommonsMetrics([first, second])).toEqual({ contributions: 2, contributors: 1 }) })
  it("defaults only new classified records to shared", () => { expect(getDefaultCourseSharing("course-1")).toBe(true); expect(getDefaultCourseSharing("")).toBe(false); expect(getDefaultCourseSharing("course-1", true)).toBe(false) })
  it("keeps attachments private unless explicitly selected", () => { const file = new File(["abc"], "note.txt", { type: "text/plain" }); expect(resolveSharedAssetIds([], [{ id: "a1", originalName: "note.txt", fileSize: file.size }], [])).toEqual([]); expect(resolveSharedAssetIds([], [{ id: "a1", originalName: "note.txt", fileSize: file.size }], [file])).toEqual(["a1"]) })
  it("runtime-validates public AI output", () => { expect(parseCourseCommonsAnalysis({ version: 1, courseSummary: "摘要", keyTopics: [], recurringDifficulties: [], recommendedReview: [], recentUpdates: [], sourceContributionIds: ["c1"] })?.courseSummary).toBe("摘要"); expect(parseCourseCommonsAnalysis({ version: 1, courseSummary: "摘要" })).toBeNull() })
})
