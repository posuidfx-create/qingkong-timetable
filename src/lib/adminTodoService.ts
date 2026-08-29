import { getAuthErrorMessage } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import type { AdminTodo, AdminTodoCompletion, AdminTodoDraft } from "@/types/adminTodo"

function requireSupabase() { if (!supabase) throw new Error("Supabase 尚未配置，管理员待办暂不可用。") ; return supabase }

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

export async function fetchAdminTodos(): Promise<AdminTodo[]> { const { data, error } = await requireSupabase().from("admin_todos").select(todoColumns).order("created_at", { ascending: false }); if (error) throw new Error(getAuthErrorMessage(error.message)); return (data ?? []).map(parseTodo).filter((item): item is AdminTodo => item !== null) }
export async function fetchAdminTodoCompletions(): Promise<AdminTodoCompletion[]> { const { data, error } = await requireSupabase().from("admin_todo_completions").select("todo_id, user_id, completed, completed_at"); if (error) throw new Error(getAuthErrorMessage(error.message)); return (data ?? []).map(parseCompletion).filter((item): item is AdminTodoCompletion => item !== null) }
export async function saveAdminTodo(draft: AdminTodoDraft, existingId?: string): Promise<AdminTodo> {
  const client = requireSupabase(); const { data: auth } = await client.auth.getUser(); if (!auth.user) throw new Error("登录状态已失效，请重新登录。")
  const payload = { title: draft.title.trim(), description: draft.description?.trim() || null, due_at: draft.dueAt, target_type: draft.targetType, target_cohort: draft.targetType === "cohort" ? draft.targetCohort : null, ...(existingId ? {} : { created_by: auth.user.id }) }
  const query = existingId ? client.from("admin_todos").update(payload).eq("id", existingId) : client.from("admin_todos").insert(payload)
  const { data, error } = await query.select(todoColumns).single(); if (error) throw new Error(getAuthErrorMessage(error.message)); const todo = parseTodo(data); if (!todo) throw new Error("待办格式异常。")
  if (todo.targetType === "users") { const { error: removeError } = await client.from("admin_todo_assignments").delete().eq("todo_id", todo.id); if (removeError) throw new Error(getAuthErrorMessage(removeError.message)); if (draft.userIds.length) { const { error: insertError } = await client.from("admin_todo_assignments").insert(draft.userIds.map((userId) => ({ todo_id: todo.id, user_id: userId }))); if (insertError) throw new Error(getAuthErrorMessage(insertError.message)) } }
  return todo
}
export async function deleteAdminTodo(id: string): Promise<void> { const { error } = await requireSupabase().from("admin_todos").delete().eq("id", id); if (error) throw new Error(getAuthErrorMessage(error.message)) }
export async function toggleAdminTodoCompletion(todoId: string, completed: boolean): Promise<void> { const client = requireSupabase(); const { data: auth } = await client.auth.getUser(); if (!auth.user) throw new Error("登录状态已失效，请重新登录。"); const { error } = await client.from("admin_todo_completions").upsert({ todo_id: todoId, user_id: auth.user.id, completed, completed_at: completed ? new Date().toISOString() : null }, { onConflict: "todo_id,user_id" }); if (error) throw new Error(getAuthErrorMessage(error.message)) }
