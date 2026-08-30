import { describe, expect, it, vi } from "vitest"
vi.mock("@/lib/supabase", () => ({ supabase: null }))

import { buildAttachmentMetadata, canRecordChatAudio, CHAT_MEDIA_LIMITS, createAttachmentDraft, createChatAttachmentPath, createPrivateConversationKey, formatAttachmentSize, getChatMessageType, normalizeMimeType, sanitizeAttachmentName, setChatPreferredKind, validateChatAttachment } from "@/lib/chatMedia"
import { buildAttachmentMessageRow, cleanupDeletedChatAttachment, insertChatAttachmentWithCleanup, uploadThenInsertChatAttachment } from "@/lib/chatMediaService"

describe("chat media", () => {
  it("classifies image, file, audio and video while rejecting dangerous files", () => {
    expect(getChatMessageType({ name: "photo.jpg", type: "image/jpeg" })).toBe("image")
    expect(getChatMessageType({ name: "paper.pdf", type: "application/pdf" })).toBe("file")
    expect(getChatMessageType({ name: "voice.ogg", type: "audio/ogg" })).toBe("audio")
    expect(getChatMessageType({ name: "clip.webm", type: "video/webm" })).toBe("video")
    expect(getChatMessageType({ name: "run.exe", type: "application/octet-stream" })).toBeNull()
    expect(getChatMessageType({ name: "danger.svg", type: "image/svg+xml" })).toBeNull()
  })
  it("enforces each per-type limit", () => {
    expect(validateChatAttachment({ name: "a.png", type: "image/png", size: CHAT_MEDIA_LIMITS.image + 1 }).error).toContain("10 MB")
    expect(validateChatAttachment({ name: "a.pdf", type: "application/pdf", size: CHAT_MEDIA_LIMITS.file + 1 }).error).toContain("20 MB")
    expect(validateChatAttachment({ name: "a.ogg", type: "audio/ogg", size: CHAT_MEDIA_LIMITS.audio + 1 }).error).toContain("20 MB")
    expect(validateChatAttachment({ name: "a.mp4", type: "video/mp4", size: CHAT_MEDIA_LIMITS.video + 1 }).error).toContain("50 MB")
    expect(validateChatAttachment({ name: "a.mp4", type: "video/mp4", size: CHAT_MEDIA_LIMITS.video }).type).toBe("video")
  })
  it("falls back to extension MIME and keeps raw byte size for ordinary files", () => {
    expect(buildAttachmentMetadata({ name: "测试.txt", type: "", size: 1024 })).toEqual({ messageType: "file", attachmentName: "测试.txt", attachmentMime: "text/plain", attachmentSize: 1024 })
    expect(buildAttachmentMetadata({ name: "作业.docx", type: "", size: 2048 })?.attachmentMime).toContain("wordprocessingml")
  })
  it("preserves File.size through the unified draft without parsing UI text", () => {
    const file = { name: "测试.txt", type: "", size: 1024 } as File
    expect(createAttachmentDraft(file)).toMatchObject({ file, kind: "file", size: 1024, mime: "text/plain" })
    expect(formatAttachmentSize(file.size)).toBe("1 KB")
    expect(createAttachmentDraft(file).size).toBe(1024)
  })
  it("uses the same source size for audio, image and video drafts", () => {
    expect(createAttachmentDraft({ name: "voice.ogg", type: "audio/ogg", size: 77 } as File).size).toBe(77)
    expect(createAttachmentDraft({ name: "image.png", type: "image/png", size: 88 } as File).size).toBe(88)
    expect(createAttachmentDraft({ name: "clip.mp4", type: "video/mp4", size: 99 } as File).size).toBe(99)
  })
  it("normalizes recorder codec MIME values and classifies audio versus video webm", () => {
    expect(normalizeMimeType("audio/webm;codecs=opus")).toBe("audio/webm")
    expect(getChatMessageType({ name: "voice.webm", type: "audio/webm;codecs=opus" })).toBe("audio")
    expect(getChatMessageType({ name: "voice.ogg", type: "audio/ogg;codecs=opus" })).toBe("audio")
    expect(getChatMessageType({ name: "video.webm", type: "video/webm;codecs=vp9,opus" })).toBe("video")
  })
  it("keeps a MediaRecorder file explicitly classified as audio", () => {
    const recording = { name: "语音.webm", type: "audio/webm", size: 25000 } as File
    setChatPreferredKind(recording, "audio")
    expect(createAttachmentDraft(recording)).toMatchObject({ kind: "audio", mime: "audio/webm", size: 25000 })
    expect(buildAttachmentMetadata(recording)?.messageType).toBe("audio")
  })
  it("maps attachment metadata to a complete snake_case database row", () => {
    expect(buildAttachmentMessageRow({ path: "group/public/user/file.txt", name: "测试.txt", mime: "text/plain", size: 1024, duration: null, width: null, height: null }, "file")).toEqual({ content: "", message_type: "file", attachment_path: "group/public/user/file.txt", attachment_name: "测试.txt", attachment_mime: "text/plain", attachment_size: 1024, attachment_duration: null, attachment_width: null, attachment_height: null })
  })
  it("rejects undefined-equivalent MIME and invalid attachment size before insert", () => {
    expect(() => buildAttachmentMessageRow({ path: "group/public/user/file.txt", name: "测试.txt", mime: "", size: 1024, duration: null, width: null, height: null }, "file")).toThrow("MIME")
    expect(() => buildAttachmentMessageRow({ path: "private/a--b/a/file.txt", name: "测试.txt", mime: "text/plain", size: Number.NaN, duration: null, width: null, height: null }, "file")).toThrow("大小")
  })
  it("creates isolated object keys without trusting original names", () => {
    expect(sanitizeAttachmentName("../作业\u0000.pdf")).toBe(". 作业 .pdf")
    expect(createPrivateConversationKey("z", "a")).toBe("a--z")
    expect(createChatAttachmentPath({ kind: "group", roomType: "cohort_2025" }, "user", { name: "../x.png" }, "uuid")).toBe("group/cohort_2025/user/uuid.png")
  })
  it("cleans up an uploaded object when the message insert fails", async () => {
    const cleanup = vi.fn(async () => true)
    await expect(insertChatAttachmentWithCleanup({ path: "group/public/u/file.png", name: "file.png", mime: "image/png", size: 1, duration: null, width: null, height: null }, "image", async () => { throw new Error("insert failed") }, cleanup)).rejects.toThrow("insert failed")
    expect(cleanup).toHaveBeenCalledWith("group/public/u/file.png")
  })
  it("does not clean up when the insert succeeds", async () => {
    const cleanup = vi.fn(async () => true)
    await expect(insertChatAttachmentWithCleanup({ path: "group/public/u/file.png", name: "file.png", mime: "image/png", size: 1, duration: null, width: null, height: null }, "image", async () => "message", cleanup)).resolves.toBe("message")
    expect(cleanup).not.toHaveBeenCalled()
  })
  it("does not insert a message when the upload fails", async () => {
    const insert = vi.fn(async () => "message")
    await expect(uploadThenInsertChatAttachment(async () => { throw new Error("upload failed") }, insert)).rejects.toThrow("upload failed")
    expect(insert).not.toHaveBeenCalled()
  })
  it("cleans a deleted attachment when a message had one", async () => {
    const cleanup = vi.fn(async () => true)
    await cleanupDeletedChatAttachment("group/public/u/file.png", cleanup)
    await cleanupDeletedChatAttachment(null, cleanup)
    expect(cleanup).toHaveBeenCalledTimes(1)
  })
  it("uses upload-audio fallback when MediaRecorder is unavailable", () => {
    expect(canRecordChatAudio(undefined, undefined)).toBe(false)
  })
})
