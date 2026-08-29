import { APP_ROLES, type AppRole, type AuthStatus, type AuthUser, type Profile, type ProfileCohortYear } from "@/types/auth"

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole)
}

export function isProfileCohortYear(value: unknown): value is ProfileCohortYear {
  return value === 2024 || value === 2025
}

export function parseProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null

  const row = value as Record<string, unknown>
  if (
    typeof row.id !== "string" ||
    typeof row.username !== "string" ||
    !isAppRole(row.role) ||
    typeof row.created_at !== "string" ||
    (row.avatar_url !== null && typeof row.avatar_url !== "string") ||
    (row.cohort_year !== null && !isProfileCohortYear(row.cohort_year))
  ) {
    return null
  }

  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
    role: row.role,
    cohortYear: row.cohort_year,
    createdAt: row.created_at,
  }
}

export function toAuthUser(value: { id: string; email?: string | null }): AuthUser {
  return { id: value.id, email: value.email ?? null }
}

export function getRoleLabel(role: AppRole): string {
  return { user: "用户", admin: "管理员", super_admin: "超级管理员" }[role]
}

export function canManageRole(
  actor: Profile | null | undefined,
  target: Profile,
): boolean {
  return actor?.role === "super_admin" && actor.id !== target.id && target.role !== "super_admin"
}

export function canChangeUserRole(actor: Profile | null | undefined, target: Profile, newRole: "user" | "admin"): boolean {
  return actor?.role === "super_admin" && actor.id !== target.id && target.role !== "super_admin" && target.role !== newRole
}

export function getAuthScreen(status: AuthStatus, user: AuthUser | null): "loading" | "auth" | "app" | "unavailable" {
  if (status === "unavailable") return "unavailable"
  if (status === "loading") return "loading"
  return user ? "app" : "auth"
}

export function getAuthErrorMessage(message: string | undefined): string {
  const source = message?.toLowerCase() ?? ""
  if (source.includes("invalid login credentials")) return "邮箱或密码不正确。"
  if (source.includes("already registered") || source.includes("already been registered")) return "该邮箱已经注册，请直接登录。"
  if (source.includes("email not confirmed")) return "请先到邮箱完成验证后再登录。"
  if (source.includes("network") || source.includes("fetch")) return "网络连接失败，请检查网络后重试。"
  if (source.includes("permission") || source.includes("row-level security")) return "没有执行此操作的权限。"
  return message || "操作未完成，请稍后重试。"
}
