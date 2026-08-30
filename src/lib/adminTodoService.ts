import { getAuthErrorMessage } from "@/lib/auth"
import { buildAdminTodoInsertRow, buildAdminTodoUpdateRow } from "@/lib/adminTodo"
import { supabase, synchronizeSupabaseSession } from "@/lib/supabase"
import { fetchTodoAttachments, removeTodoAttachments, uploadTodoAttachments } from "@/lib/todoAttachmentService"
import { createTodoAttachmentDraft, getTodoAttachmentPublishErrorMessage, MAX_TODO_ATTACHMENTS, TodoAttachmentPublishError } from "@/lib/todoAttachments"
import type { AdminTodo, AdminTodoCompletion, AdminTodoDraft } from "@/types/adminTodo"

function requireSupabase() { if (!supabase) throw new Error("Supabase 尚未配置，管理员待办暂不可用。") ; return supabase }
function logTodoPublishError(stage: string, error: unknown): void { if (!import.meta.env.DEV || !error || typeof error !== "object") return; const source = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown; statusCode?: unknown; status?: unknown }; console.error("[todo publish] failed", { stage, code: source.code, message: source.message, details: source.details, hint: source.hint, statusCode: source.statusCode ?? source.status }) }

function parseTodo(value: unknown): AdminTodo | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== "string" || typeof row.title !== "string" || (row.description !== null && typeof row.description !== "string") || !["all", "cohort", "users"].includes(String(row.target_type)) || (row.target_cohort !== null && row.target_cohort !== 2024 && row.target_cohort !== 2025) || typeof row.created_by !== "string" || (row.due_at !== null && typeof row.due_at !== "string") || typeof row.created_at !== "string" || typeof row.updated_at !== "string") return null
  return { id: row.id, title: row.title, description: row.description as string | null, targetType: row.target_type as AdminTodo["targetType"], targetCohort: row.target_cohort as AdminTodo["targetCohort"], createdBy: row.created_by, dueAt: row.due_at as string | null, createdAt: row.created_at, updatedAt: row.updated_at }
}
function parseCompletion(value: unknown): AdminTodoCompletion | null {
  if (!value || typeof value !== "object") return null; const row = value as Record<string, unknown>
  if (typeof row.todo_id !== "string" || typeof row.user_id !== "string" || typeof row.completed !== "boolean" || (row.completed_at !== null && typeof row.completed_at !== "string")) return null
  return { todoId: row.todo_id, userId: row.user_id, completed: row.completed, completedAt: row.completed_at as string | null }
}
const todoColumns = "id, title, description, target_type, target_cohort, created_by, due_at, created_at, updated_at"

export async function fetchAdminTodos(): Promise<AdminTodo[]> { const { data, error } = await requireSupabase().from("admin_todos").select(todoColumns).order("created_at", { ascending: false }); if (error) throw new Error(getAuthErrorMessage(error.message)); const todos = (data ?? []).map(parseTodo).filter((item): item is AdminTodo => item !== null); const attachments = await fetchTodoAttachments(todos.map((todo) => todo.id)); return todos.map((todo) => ({ ...todo, attachments: attachments.filter((attachment) => attachment.todoId === todo.id) })) }
export async function fetchAdminTodoCompletions(): Promise<AdminTodoCompletion[]> { const { data, error } = await requireSupabase().from("admin_todo_completions").select("todo_id, user_id, completed, completed_at"); if (error) throw new Error(getAuthErrorMessage(error.message)); return (data ?? []).map(parseCompletion).filter((item): item is AdminTodoCompletion => item !== null) }
export async function saveAdminTodo(draft: AdminTodoDraft, existingId?: string, onUploadProgress?: (current: number, total: number) => void): Promise<AdminTodo> {
  const client = requireSupabase(); const sessionState = await synchronizeSupabaseSession(); const { data: auth } = await client.auth.getUser(); if (!auth.user) throw new Error("登录状态已失效，请重新登录。")
  void sessionState
  draft.attachments.forEach(createTodoAttachmentDraft)
  if (draft.attachments.length > MAX_TODO_ATTACHMENTS) throw new Error("每条待办最多添加 5 个附件。")
  let data: unknown
  let error: { message: string } | null = null
  if (existingId) ({ data, error } = await client.from("admin_todos").update(buildAdminTodoUpdateRow(draft)).eq("id", existingId).select(todoColumns).single())
  else {
    const row = buildAdminTodoInsertRow(draft, auth.user.id, crypto.randomUUID())
    const { error: insertError } = await client.from("admin_todos").insert(row)
    if (insertError) { logTodoPublishError("admin_todos_insert", insertError); throw new Error("当前账号没有发布管理员待办的权限。", { cause: insertError }) }
    const result = await client.from("admin_todos").select(todoColumns).eq("id", row.id).maybeSingle()
    if (result.error || !result.data) { const { error: cleanupError } = await client.from("admin_todos").delete().eq("id", row.id); if (cleanupError) logTodoPublishError("admin_todos_select_cleanup", cleanupError); throw new Error("待办已创建但无法读取，已取消本次发布。", { cause: result.error ?? undefined }) }
    data = result.data
  }
  if (error) {
    logTodoPublishError("admin_todos_insert_or_update", error)
    const denied = error.message.toLowerCase().includes("permission") || error.message.toLowerCase().includes("row-level security")
    throw new Error(denied ? "当前账号没有发布管理员待办的权限。" : `待办保存失败：${getAuthErrorMessage(error.message)}`)
  }
  const todo = parseTodo(data); if (!todo) throw new Error("待办格式异常。")
  if (todo.targetType === "users") { const { error: removeError } = await client.from("admin_todo_assignments").delete().eq("todo_id", todo.id); if (removeError) throw new Error(getAuthErrorMessage(removeError.message)); if (draft.userIds.length) { const { error: insertError } = await client.from("admin_todo_assignments").insert(draft.userIds.map((userId) => ({ todo_id: todo.id, user_id: userId }))); if (insertError) throw new Error(getAuthErrorMessage(insertError.message)) } }
  try {
    const existingAttachments = existingId ? await fetchTodoAttachments([todo.id]) : []
    const removedAttachments = existingAttachments.filter((attachment) => draft.removedAttachmentIds.includes(attachment.id))
    const attachmentCount = existingAttachments.length - removedAttachments.length + draft.attachments.length
    if (attachmentCount > MAX_TODO_ATTACHMENTS) throw new Error("每条待办最多添加 5 个附件。")
    if (removedAttachments.length) await removeTodoAttachments(removedAttachments)
    const uploadedAttachments = await uploadTodoAttachments(todo.id, draft.attachments, onUploadProgress)
    return { ...todo, attachments: [...existingAttachments.filter((attachment) => !draft.removedAttachmentIds.includes(attachment.id)), ...uploadedAttachments] }
  } catch (reason) {
    if (!existingId) { const { error: rollbackError } = await client.from("admin_todos").delete().eq("id", todo.id); if (rollbackError) logTodoPublishError("todo_rollback", rollbackError) }
    if (reason instanceof TodoAttachmentPublishError) throw new Error(getTodoAttachmentPublishErrorMessage(reason), { cause: reason })
    throw reason
  }
}
export async function deleteAdminTodo(id: string): Promise<void> { const client = requireSupabase(); const attachments = await fetchTodoAttachments([id]); if (attachments.length) await removeTodoAttachments(attachments); const { error } = await client.from("admin_todos").delete().eq("id", id); if (error) throw new Error(getAuthErrorMessage(error.message)) }
export async function toggleAdminTodoCompletion(todoId: string, completed: boolean): Promise<void> { const client = requireSupabase(); const { data: auth } = await client.auth.getUser(); if (!auth.user) throw new Error("登录状态已失效，请重新登录。"); const { error } = await client.from("admin_todo_completions").upsert({ todo_id: todoId, user_id: auth.user.id, completed, completed_at: completed ? new Date().toISOString() : null }, { onConflict: "todo_id,user_id" }); if (error) throw new Error(getAuthErrorMessage(error.message)) }
