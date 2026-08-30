import { getAuthErrorMessage } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { buildTodoAttachmentInsertRow, createTodoAttachmentDraft, createTodoAttachmentPath, getTodoAttachmentPublishErrorMessage, TODO_ATTACHMENT_BUCKET, TodoAttachmentPublishError, type TodoAttachmentPublishStage } from "@/lib/todoAttachments"
import type { TodoAttachment } from "@/types/adminTodo"

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()
function logStageError(stage: TodoAttachmentPublishStage, error: unknown): void {
  if (!import.meta.env.DEV || !error || typeof error !== "object") return
  const source = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown; statusCode?: unknown; status?: unknown }
  console.error("[todo attachment] publish failed", { stage, code: source.code, message: source.message, details: source.details, hint: source.hint, statusCode: source.statusCode ?? source.status })
}


function requireSupabase() { if (!supabase) throw new Error("Supabase 尚未配置，待办附件暂不可用。") ; return supabase }

function parseTodoAttachment(value: unknown): TodoAttachment | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== "string" || typeof row.todo_id !== "string" || typeof row.uploader_id !== "string" || typeof row.attachment_path !== "string" || typeof row.attachment_name !== "string" || typeof row.attachment_mime !== "string" || typeof row.attachment_size !== "number" || (row.attachment_kind !== "image" && row.attachment_kind !== "file") || typeof row.created_at !== "string") return null
  return { id: row.id, todoId: row.todo_id, uploaderId: row.uploader_id, path: row.attachment_path, name: row.attachment_name, mime: row.attachment_mime, size: row.attachment_size, kind: row.attachment_kind, createdAt: row.created_at }
}

export async function fetchTodoAttachments(todoIds: readonly string[]): Promise<TodoAttachment[]> {
  if (!todoIds.length) return []
  const { data, error } = await requireSupabase().from("todo_attachments").select("id, todo_id, uploader_id, attachment_path, attachment_name, attachment_mime, attachment_size, attachment_kind, created_at").in("todo_id", [...todoIds]).order("created_at")
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return (data ?? []).map(parseTodoAttachment).filter((item): item is TodoAttachment => item !== null)
}

export async function uploadTodoAttachments(todoId: string, files: readonly File[], onProgress?: (current: number, total: number) => void): Promise<TodoAttachment[]> {
  if (!files.length) return []
  const client = requireSupabase(); const { data: auth } = await client.auth.getUser()
  if (!auth.user) throw new Error("登录状态已失效，请重新登录。")
  const uploaded: Array<{ path: string; draft: ReturnType<typeof createTodoAttachmentDraft>; id: string }> = []
  try {
    for (const [index, file] of files.entries()) {
      onProgress?.(index + 1, files.length)
      const draft = createTodoAttachmentDraft(file)
      const path = createTodoAttachmentPath(todoId, auth.user.id, file.name, crypto.randomUUID())
      const { error } = await client.storage.from(TODO_ATTACHMENT_BUCKET).upload(path, file, { contentType: draft.mime, upsert: false })
      if (error) { logStageError("storage_upload", error); throw new TodoAttachmentPublishError("storage_upload", getTodoAttachmentPublishErrorMessage(new TodoAttachmentPublishError("storage_upload", "")), error) }
      uploaded.push({ path, draft, id: crypto.randomUUID() })
    }
    const rows = uploaded.map(({ path, draft, id }) => buildTodoAttachmentInsertRow(todoId, auth.user!.id, path, draft, id))
    const { error: insertError } = await client.from("todo_attachments").insert(rows)
    if (insertError) { logStageError("metadata_insert", insertError); throw new TodoAttachmentPublishError("metadata_insert", getTodoAttachmentPublishErrorMessage(new TodoAttachmentPublishError("metadata_insert", "")), insertError) }
    const { data, error: selectError } = await client.from("todo_attachments").select("id, todo_id, uploader_id, attachment_path, attachment_name, attachment_mime, attachment_size, attachment_kind, created_at").in("id", rows.map((row) => row.id))
    if (selectError || !data || data.length !== rows.length) {
      const { error: metadataCleanupError } = await client.from("todo_attachments").delete().in("id", rows.map((row) => row.id))
      if (metadataCleanupError) logStageError("metadata_insert", metadataCleanupError)
      throw new TodoAttachmentPublishError("metadata_insert", "附件已写入但读取返回失败，已取消本次发布。", selectError)
    }
    return data.map(parseTodoAttachment).filter((item): item is TodoAttachment => item !== null)
  } catch (reason) {
    if (uploaded.length) { const { error } = await client.storage.from(TODO_ATTACHMENT_BUCKET).remove(uploaded.map((item) => item.path)); if (error) logStageError("storage_cleanup", error) }
    throw reason
  }
}

export async function removeTodoAttachments(attachments: readonly Pick<TodoAttachment, "id" | "path">[]): Promise<void> {
  if (!attachments.length) return
  const client = requireSupabase()
  const { error: storageError } = await client.storage.from(TODO_ATTACHMENT_BUCKET).remove(attachments.map((item) => item.path))
  if (storageError) throw new Error("附件文件删除失败，请稍后重试。")
  const { error } = await client.from("todo_attachments").delete().in("id", attachments.map((item) => item.id))
  if (error) throw new Error(getAuthErrorMessage(error.message))
}

export async function getTodoAttachmentUrl(path: string): Promise<string> {
  const cached = signedUrlCache.get(path); if (cached && cached.expiresAt > Date.now()) return cached.url
  const { data, error } = await requireSupabase().storage.from(TODO_ATTACHMENT_BUCKET).createSignedUrl(path, 60 * 60)
  if (error || !data?.signedUrl) throw new Error("附件链接生成失败，请稍后重试。")
  signedUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + 55 * 60 * 1000 }); return data.signedUrl
}
