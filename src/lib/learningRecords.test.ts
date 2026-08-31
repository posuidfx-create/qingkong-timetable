import { describe, expect, it } from "vitest"

import {
  appendLearningAssetDrafts,
  buildLearningAssetInsertRow,
  buildLearningRecordInsertRow,
  createLearningAssetDraft,
  createLearningAssetPath,
  getCourseRecordCounts,
  getLearningMaterialsBucket,
  isLearningRecordType,
  LEARNING_ASSET_LIMITS,
  MAX_LEARNING_ASSETS,
  sortLearningRecords,
} from "@/lib/learningRecords"
import type { LearningRecord, LearningRecordDraft } from "@/types/learning"

function file(name: string, type: string, size: number): File { return { name, type, size } as File }
const draft: LearningRecordDraft = { recordDate: "2026-09-01", title: "课堂回顾", courseName: "综合日语（三）", courseKey: "builtin-25", type: "class", content: "今天学习了新的语法。", moodNote: "" }

describe("learning records", () => {
  it("recognizes supported record types", () => {
    expect(["daily", "class", "note", "achievement"].every(isLearningRecordType)).toBe(true)
    expect(isLearningRecordType("unknown")).toBe(false)
  })
  it("builds a user-bound course snapshot payload", () => {
    expect(buildLearningRecordInsertRow(draft, "auth-user", "record-id")).toEqual({ id: "record-id", user_id: "auth-user", record_date: "2026-09-01", title: "课堂回顾", course_name: "综合日语（三）", course_key: "builtin-25", record_type: "class", content: "今天学习了新的语法。", mood_note: null })
  })
  it("requires content and a course for class records", () => {
    expect(() => buildLearningRecordInsertRow({ ...draft, courseName: "" }, "u", "r")).toThrow("course_required")
    expect(() => buildLearningRecordInsertRow({ ...draft, title: "", content: "" }, "u", "r")).toThrow("content_required")
  })
  it("allows image-only and audio-only records but rejects a completely empty record", () => {
    const empty = { ...draft, type: "daily" as const, courseName: "", courseKey: "", title: "", content: "", moodNote: "" }
    expect(() => buildLearningRecordInsertRow(empty, "u", "image-record", 1)).not.toThrow()
    expect(() => buildLearningRecordInsertRow(empty, "u", "audio-record", 1)).not.toThrow()
    expect(() => buildLearningRecordInsertRow(empty, "u", "empty-record", 0)).toThrow("content_required")
  })
  it.each([
    ["photo.heic", "image/heic", "image"], ["note.pdf", "application/pdf", "document"], ["voice.webm", "audio/webm;codecs=opus", "audio"],
  ] as const)("classifies %s as %s", (name, mime, kind) => expect(createLearningAssetDraft(file(name, mime, 1024)).type).toBe(kind))
  it("enforces image, document, and audio byte limits", () => {
    expect(() => createLearningAssetDraft(file("valid.jpg", "image/jpeg", LEARNING_ASSET_LIMITS.image))).not.toThrow()
    expect(() => createLearningAssetDraft(file("valid.pdf", "application/pdf", LEARNING_ASSET_LIMITS.document))).not.toThrow()
    expect(() => createLearningAssetDraft(file("valid.mp3", "audio/mpeg", LEARNING_ASSET_LIMITS.audio))).not.toThrow()
    expect(() => createLearningAssetDraft(file("large.jpg", "image/jpeg", LEARNING_ASSET_LIMITS.image + 1))).toThrow("image_too_large")
    expect(() => createLearningAssetDraft(file("large.pdf", "application/pdf", LEARNING_ASSET_LIMITS.document + 1))).toThrow("document_too_large")
    expect(() => createLearningAssetDraft(file("large.mp3", "audio/mpeg", LEARNING_ASSET_LIMITS.audio + 1))).toThrow("audio_too_large")
  })
  it("routes valid files to category-specific private buckets", () => {
    expect(getLearningMaterialsBucket("image")).toBe("learning-materials-images")
    expect(getLearningMaterialsBucket("document")).toBe("learning-materials-documents")
    expect(getLearningMaterialsBucket("audio")).toBe("learning-materials-audio")
  })
  it("rejects unsafe extensions even with a forged MIME", () => expect(() => createLearningAssetDraft(file("page.html", "image/png", 1))).toThrow("unsupported_type"))
  it("limits every record to twenty attachments", () => {
    expect(MAX_LEARNING_ASSETS).toBe(20)
    expect(() => appendLearningAssetDrafts(20, [file("a.png", "image/png", 1)])).toThrow("too_many_assets")
  })
  it("creates a server-verifiable path and metadata row", () => {
    const asset = createLearningAssetDraft(file("课堂笔记.pdf", "application/pdf", 2048))
    const path = createLearningAssetPath("auth-user", "record-id", asset, "object-id")
    expect(path).toBe("learning/auth-user/record-id/object-id.pdf")
    const row = buildLearningAssetInsertRow("record-id", "auth-user", path, asset, "asset-id", 0)
    expect(row).toMatchObject({ record_id: "record-id", user_id: "auth-user", storage_bucket: "learning-materials-documents", storage_path: path })
    expect(row).not.toHaveProperty("processing_status")
  })
  it("aggregates course archives and sorts the timeline", () => {
    const base = { userId: "u", title: null, courseKey: null, type: "class" as const, content: null, moodNote: null, updatedAt: "2026-09-01", assets: [] }
    const records = [
      { ...base, id: "2", recordDate: "2026-08-31", courseName: "日语", createdAt: "2026-08-31" },
      { ...base, id: "1", recordDate: "2026-09-01", courseName: "日语", createdAt: "2026-09-01" },
    ] satisfies LearningRecord[]
    expect(getCourseRecordCounts(records)).toEqual([{ courseName: "日语", count: 2 }])
    expect(sortLearningRecords(records).map((record) => record.id)).toEqual(["1", "2"])
  })
})
