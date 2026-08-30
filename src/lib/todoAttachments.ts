import { formatAttachmentSize, normalizeMimeType, sanitizeAttachmentName } from "@/lib/chatMedia"

export const TODO_ATTACHMENT_BUCKET = "todo-attachments"
export const TODO_ATTACHMENT_LIMITS = { image: 10 * 1024 * 1024, file: 20 * 1024 * 1024 } as const
export const MAX_TODO_ATTACHMENTS = 5

export type TodoAttachmentPublishStage = "storage_upload" | "metadata_insert" | "storage_cleanup"
export class TodoAttachmentPublishError extends Error {
  constructor(public readonly stage: TodoAttachmentPublishStage, message: string, public readonly cause?: unknown) { super(message) }
}
export function getTodoAttachmentPublishErrorMessage(error: unknown): string {
  if (!(error instanceof TodoAttachmentPublishError)) return error instanceof Error ? error.message : "待办发布失败，请稍后重试。"
  return error.stage === "storage_upload" ? "附件上传权限验证失败，请重新登录后重试。" : error.stage === "metadata_insert" ? "附件信息保存失败，已取消本次发布。" : "附件清理失败，请刷新后确认待办状态。"
}

const imageMimes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const fileMimes = new Set(["application/pdf", "application/zip", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"])
const mimeByExtension: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", txt: "text/plain", zip: "application/zip" }

export type TodoAttachmentKind = "image" | "file"
export interface TodoAttachmentDraft { file: File; kind: TodoAttachmentKind; name: string; mime: string; size: number }
export interface TodoAttachmentInsertRow { id: string; todo_id: string; uploader_id: string; attachment_path: string; attachment_name: string; attachment_mime: string; attachment_size: number; attachment_kind: TodoAttachmentKind }

function extensionOf(name: string): string { return name.split(".").pop()?.toLowerCase() ?? "" }

export function createTodoAttachmentDraft(file: File): TodoAttachmentDraft {
  const mime = normalizeMimeType(file.type) || mimeByExtension[extensionOf(file.name)]
  const kind = imageMimes.has(mime) ? "image" : fileMimes.has(mime) ? "file" : null
  if (!kind) throw new Error("仅支持图片、PDF、Office 文档、TXT 或 ZIP 附件。")
  if (!Number.isFinite(file.size) || file.size <= 0) throw new Error("附件大小信息丢失。")
  if (file.size > TODO_ATTACHMENT_LIMITS[kind]) throw new Error(`${kind === "image" ? "图片" : "文件"}不能超过 ${TODO_ATTACHMENT_LIMITS[kind] / 1024 / 1024} MB。`)
  return { file, kind, name: sanitizeAttachmentName(file.name), mime, size: file.size }
}

export function appendTodoAttachmentDrafts(existingCount: number, files: readonly File[]): TodoAttachmentDraft[] {
  const drafts = files.map(createTodoAttachmentDraft)
  if (existingCount + drafts.length > MAX_TODO_ATTACHMENTS) throw new Error("每条待办最多添加 5 个附件。")
  return drafts
}

export function createTodoAttachmentPath(todoId: string, userId: string, fileName: string, objectId: string): string {
  const extension = extensionOf(fileName)
  return `todo/${todoId}/${userId}/${objectId}.${extension || "bin"}`
}

export function buildTodoAttachmentInsertRow(todoId: string, uploaderId: string, path: string, draft: Omit<TodoAttachmentDraft, "file">, id: string): TodoAttachmentInsertRow {
  if (!todoId || !uploaderId || !id) throw new Error("附件身份信息缺失。")
  return { id, todo_id: todoId, uploader_id: uploaderId, attachment_path: path, attachment_name: draft.name, attachment_mime: draft.mime, attachment_size: draft.size, attachment_kind: draft.kind }
}

export function getTodoAttachmentLabel(attachment: Pick<TodoAttachmentDraft, "name" | "size">): string { return `${attachment.name} · ${formatAttachmentSize(attachment.size)}` }
