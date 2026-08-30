import { describe, expect, it } from "vitest"

import { appendTodoAttachmentDrafts, buildTodoAttachmentInsertRow, createTodoAttachmentDraft, createTodoAttachmentPath, getTodoAttachmentPublishErrorMessage, MAX_TODO_ATTACHMENTS, TODO_ATTACHMENT_LIMITS, TodoAttachmentPublishError } from "@/lib/todoAttachments"

function file(name: string, type: string, size: number): File { return { name, type, size } as File }

describe("todo attachments", () => {
  it("accepts supported image and learning-file types with their real byte size", () => {
    expect(createTodoAttachmentDraft(file("作业.png", "image/png", 1024))).toMatchObject({ kind: "image", mime: "image/png", size: 1024 })
    expect(createTodoAttachmentDraft(file("通知.pdf", "application/pdf", 2048))).toMatchObject({ kind: "file", mime: "application/pdf", size: 2048 })
    expect(createTodoAttachmentDraft(file("表格.xlsx", "", 2048))).toMatchObject({ kind: "file", size: 2048 })
  })
  it("rejects unsupported and oversized attachments", () => {
    expect(() => createTodoAttachmentDraft(file("脚本.js", "text/javascript", 1))).toThrow("仅支持")
    expect(() => createTodoAttachmentDraft(file("大图.png", "image/png", TODO_ATTACHMENT_LIMITS.image + 1))).toThrow("图片不能超过")
    expect(() => createTodoAttachmentDraft(file("大文件.zip", "application/zip", TODO_ATTACHMENT_LIMITS.file + 1))).toThrow("文件不能超过")
  })
  it("creates a stable server-verifiable todo path and limits each todo to five attachments", () => {
    expect(createTodoAttachmentPath("todo-id", "user-id", "通知.pdf", "object-id")).toBe("todo/todo-id/user-id/object-id.pdf")
    expect(MAX_TODO_ATTACHMENTS).toBe(5)
  })
  it("maps metadata ids and paths to the real todo and authenticated uploader", () => {
    const row = buildTodoAttachmentInsertRow("todo-id", "auth-id", "todo/todo-id/auth-id/file.txt", { kind: "file", name: "测试.txt", mime: "text/plain", size: 1024 }, "attachment-id")
    expect(row).toMatchObject({ id: "attachment-id", todo_id: "todo-id", uploader_id: "auth-id", attachment_path: "todo/todo-id/auth-id/file.txt", attachment_kind: "file" })
  })
  it("uses each explicit attachment id exactly once for pure insert then select", () => {
    const first = buildTodoAttachmentInsertRow("todo-id", "auth-id", "todo/todo-id/auth-id/one.txt", { kind: "file", name: "一.txt", mime: "text/plain", size: 1 }, "attachment-one")
    const second = buildTodoAttachmentInsertRow("todo-id", "auth-id", "todo/todo-id/auth-id/two.txt", { kind: "file", name: "二.txt", mime: "text/plain", size: 1 }, "attachment-two")
    expect(new Set([first.id, second.id]).size).toBe(2)
  })
  it("accepts a multi-file drop only while the total stays within five", () => {
    const files = [file("a.txt", "text/plain", 1), file("b.txt", "text/plain", 2)]
    expect(appendTodoAttachmentDrafts(3, files)).toHaveLength(2)
    expect(() => appendTodoAttachmentDrafts(4, files)).toThrow("最多添加 5")
  })
  it("keeps image and document classifications separate for preview and download rendering", () => {
    expect(createTodoAttachmentDraft(file("截图.webp", "image/webp", 2)).kind).toBe("image")
    expect(createTodoAttachmentDraft(file("说明.txt", "text/plain", 2)).kind).toBe("file")
  })
  it("keeps Storage and metadata permission failures distinguishable to the publisher", () => {
    expect(getTodoAttachmentPublishErrorMessage(new TodoAttachmentPublishError("storage_upload", ""))).toContain("上传权限")
    expect(getTodoAttachmentPublishErrorMessage(new TodoAttachmentPublishError("metadata_insert", ""))).toContain("信息保存")
  })
})
