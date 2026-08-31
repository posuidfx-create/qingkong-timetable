import type { Profile } from "@/types/auth"
import type { AdminTodo, AdminTodoDraft, AdminTodoTargetType } from "@/types/adminTodo"
import type { AppLocale } from "@/i18n/locale"
import { translate } from "@/i18n/translate"

export function buildAdminTodoCreateRow(draft: AdminTodoDraft, authUserId: string) {
  if (!authUserId) throw new Error("登录状态已失效，请重新登录。")
  return {
    title: draft.title.trim(),
    description: draft.description?.trim() || null,
    due_at: draft.dueAt,
    target_type: draft.targetType,
    target_cohort: draft.targetType === "cohort" ? draft.targetCohort : null,
    created_by: authUserId,
  }
}

export function buildAdminTodoInsertRow(draft: AdminTodoDraft, authUserId: string, id: string) {
  if (!id) throw new Error("待办 ID 缺失。")
  return { ...buildAdminTodoCreateRow(draft, authUserId), id }
}

export function buildAdminTodoUpdateRow(draft: AdminTodoDraft) {
  return {
    title: draft.title.trim(),
    description: draft.description?.trim() || null,
    due_at: draft.dueAt,
    target_type: draft.targetType,
    target_cohort: draft.targetType === "cohort" ? draft.targetCohort : null,
  }
}

export function canManageAdminTodos(profile: Profile | null | undefined): boolean {
  return profile?.role === "admin" || profile?.role === "super_admin"
}

export function canAccessAdminTodo(todo: Pick<AdminTodo, "targetType" | "targetCohort">, profile: Profile, assignedUserIds: readonly string[] = []): boolean {
  if (canManageAdminTodos(profile)) return true
  if (todo.targetType === "all") return true
  if (todo.targetType === "cohort") return todo.targetCohort === profile.cohortYear
  return assignedUserIds.includes(profile.id)
}

export function getVisibleAdminTodoTabs(profile: Profile): Array<"mine" | "cohort_2024" | "cohort_2025"> {
  if (canManageAdminTodos(profile)) return ["mine", "cohort_2024", "cohort_2025"]
  return profile.cohortYear === 2024 ? ["mine", "cohort_2024"] : profile.cohortYear === 2025 ? ["mine", "cohort_2025"] : ["mine"]
}

export function getAdminTodoTargetLabel(targetType: AdminTodoTargetType, targetCohort: 2024 | 2025 | null, locale: AppLocale = "zh-CN"): string {
  if (targetType === "all") return translate(locale, "todo.audienceAll")
  if (targetType === "users") return translate(locale, "todo.audienceUsers")
  return translate(locale, targetCohort === 2024 ? "profile.grade24" : "profile.grade25")
}

export function sortAdminTodos(todos: readonly AdminTodo[]): AdminTodo[] {
  return [...todos].sort((left, right) => {
    const leftTime = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER
    const rightTime = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER
    return leftTime - rightTime || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
}
