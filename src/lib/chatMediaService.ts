import { createAttachmentDraft, createChatAttachmentPath, getChatRecordingDuration, logAttachmentFileDiagnostics } from "@/lib/chatMedia"
import { supabase } from "@/lib/supabase"
import type { ChatAttachment, ChatMessageType, ChatRoomType, PrivateMessage } from "@/types/chat"
import type { ChatMessage } from "@/types/chat"

export const CHAT_MEDIA_BUCKET = "chat-media"
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

function requireSupabase() {
  if (!supabase) throw new Error("Supabase 尚未配置，聊天暂不可用。")
  return supabase
}

export interface MediaMetadata { duration?: number | null; width?: number | null; height?: number | null }
export type UploadScope = { kind: "group"; roomType: ChatRoomType } | { kind: "private"; otherUserId: string }
export interface AttachmentMessageRow {
  content: ""
  message_type: Exclude<ChatMessageType, "text">
  attachment_path: string
  attachment_name: string
  attachment_mime: string
  attachment_size: number
  attachment_duration: number | null
  attachment_width: number | null
  attachment_height: number | null
}

function assertAttachmentRow(row: AttachmentMessageRow): void {
  if (!row.attachment_path) throw new Error("附件路径缺失，未发送数据库请求。")
  if (!row.attachment_name) throw new Error("附件名称缺失，未发送数据库请求。")
  if (!row.attachment_mime) throw new Error("附件 MIME 缺失，未发送数据库请求。")
  if (!Number.isFinite(row.attachment_size) || row.attachment_size <= 0) throw new Error("附件大小无效，未发送数据库请求。")
}

export function buildAttachmentMessageRow(attachment: ChatAttachment, messageType: Exclude<ChatMessageType, "text">): AttachmentMessageRow {
  if (import.meta.env.DEV) console.info("[chat attachment] row input", { attachmentSize: attachment.size, attachmentSizeType: typeof attachment.size, isFinite: Number.isFinite(attachment.size) })
  const row: AttachmentMessageRow = { content: "", message_type: messageType, attachment_path: attachment.path, attachment_name: attachment.name, attachment_mime: attachment.mime, attachment_size: attachment.size, attachment_duration: attachment.duration ?? null, attachment_width: attachment.width ?? null, attachment_height: attachment.height ?? null }
  assertAttachmentRow(row)
  return row
}

export function logAttachmentInsertDiagnostics(table: "chat_messages" | "private_messages", row: AttachmentMessageRow): void {
  if (!import.meta.env.DEV) return
  console.info(`[${table}] attachment insert payload`, { message_type: row.message_type, content: row.content, contentLength: row.content.length, attachment_path: row.attachment_path, hasAttachmentPath: Boolean(row.attachment_path), attachment_name: row.attachment_name, attachment_mime: row.attachment_mime, attachment_size: row.attachment_size, attachment_duration: row.attachment_duration, attachment_width: row.attachment_width, attachment_height: row.attachment_height })
}

export function logAttachmentInsertError(table: "chat_messages" | "private_messages", error: unknown): void {
  if (!import.meta.env.DEV || !error || typeof error !== "object") return
  const postgres = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown }
  console.error(`[${table}] attachment insert error`, { code: postgres.code, message: postgres.message, details: postgres.details, hint: postgres.hint })
}

export async function uploadChatAttachment(scope: UploadScope, file: File, metadata: MediaMetadata = {}): Promise<ChatAttachment> {
  const client = requireSupabase()
  const draft = createAttachmentDraft(file)
  logAttachmentFileDiagnostics("upload", file, { kind: draft.kind, name: draft.name, mime: draft.mime, size: draft.size })
  const { data: authData } = await client.auth.getUser()
  if (!authData.user) throw new Error("登录状态已失效，请重新登录。")
  const path = createChatAttachmentPath(scope, authData.user.id, file, crypto.randomUUID())
  const { error } = await client.storage.from(CHAT_MEDIA_BUCKET).upload(path, file, { contentType: draft.mime, upsert: false })
  if (error) throw new Error(`${draft.kind === "image" ? "图片" : draft.kind === "video" ? "视频" : draft.kind === "audio" ? "语音" : "文件"}上传失败，请检查网络后重试。`)
  return { path, name: draft.name, mime: draft.mime, size: file.size, duration: metadata.duration ?? getChatRecordingDuration(file), width: metadata.width ?? null, height: metadata.height ?? null }
}

export async function removeChatAttachment(path: string): Promise<boolean> {
  const { error } = await requireSupabase().storage.from(CHAT_MEDIA_BUCKET).remove([path])
  return !error
}

export async function cleanupDeletedChatAttachment(path: string | null, cleanup: (path: string) => Promise<boolean> = removeChatAttachment): Promise<void> {
  if (path) await cleanup(path)
}

export async function getChatAttachmentUrl(path: string): Promise<string> {
  const cached = signedUrlCache.get(path)
  if (cached && cached.expiresAt > Date.now()) return cached.url
  const { data, error } = await requireSupabase().storage.from(CHAT_MEDIA_BUCKET).createSignedUrl(path, 60 * 60)
  if (error || !data?.signedUrl) throw new Error("附件链接生成失败，请稍后重试。")
  signedUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + 55 * 60 * 1000 })
  return data.signedUrl
}

export async function insertChatAttachmentWithCleanup<T>(attachment: ChatAttachment, type: Exclude<ChatMessageType, "text">, insertMessage: (attachment: ChatAttachment, type: Exclude<ChatMessageType, "text">) => Promise<T>, cleanup: (path: string) => Promise<boolean> = removeChatAttachment): Promise<T> {
  try {
    return await insertMessage(attachment, type)
  } catch (reason) {
    await cleanup(attachment.path)
    throw reason
  }
}

export async function uploadThenInsertChatAttachment<T>(upload: () => Promise<ChatAttachment>, insert: (attachment: ChatAttachment) => Promise<T>): Promise<T> {
  const attachment = await upload()
  return insert(attachment)
}

export async function sendAttachmentWithCleanup<T extends ChatMessage | PrivateMessage>(file: File, scope: UploadScope, insertMessage: (attachment: ChatAttachment, type: Exclude<ChatMessageType, "text">) => Promise<T>, metadata?: MediaMetadata): Promise<T> {
  const draft = createAttachmentDraft(file)
  return uploadThenInsertChatAttachment(() => uploadChatAttachment(scope, file, metadata), (attachment) => insertChatAttachmentWithCleanup(attachment, draft.kind, insertMessage))
}
