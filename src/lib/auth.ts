import { APP_ROLES, PROFILE_IDENTITY_TYPES, type AppRole, type AuthStatus, type AuthUser, type Profile, type ProfileCohortYear, type ProfileIdentityType } from "@/types/auth"
import type { AppLocale } from "@/i18n/locale"
import { getCurrentLocale } from "@/i18n/locale"
import { translate } from "@/i18n/translate"
import { isValidProfileIdentity } from "@/lib/profileIdentity"

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole)
}

export function isProfileCohortYear(value: unknown): value is ProfileCohortYear {
  return value === 2024 || value === 2025
}

export function isProfileIdentityType(value: unknown): value is ProfileIdentityType {
  return typeof value === "string" && PROFILE_IDENTITY_TYPES.includes(value as ProfileIdentityType)
}

export function parseProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null

  const row = value as Record<string, unknown>
  if (
    typeof row.id !== "string" ||
    typeof row.username !== "string" ||
    (row.title !== null && typeof row.title !== "string") ||
    !isAppRole(row.role) ||
    typeof row.created_at !== "string" ||
    (row.avatar_url !== null && typeof row.avatar_url !== "string") ||
    (row.cohort_year !== null && !isProfileCohortYear(row.cohort_year)) ||
    (row.identity_type !== null && row.identity_type !== undefined && !isProfileIdentityType(row.identity_type))
  ) {
    return null
  }

  const identityType = row.identity_type === undefined ? null : row.identity_type
  if (identityType !== null && !isValidProfileIdentity(identityType, row.cohort_year)) return null

  return {
    id: row.id,
    username: row.username,
    title: row.title,
    avatarUrl: row.avatar_url,
    role: row.role,
    identityType,
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

export function canEditUserProfile(actor: Profile | null | undefined, target: Profile): boolean {
  if (!actor || actor.id === target.id || target.role === "super_admin") return false
  return actor.role === "super_admin" || actor.role === "admin" && target.role === "user"
}

export function canEditOwnProfile(profile: Profile | null | undefined): boolean {
  return profile !== null && profile !== undefined
}

export function canChangeUserRole(actor: Profile | null | undefined, target: Profile, newRole: "user" | "admin"): boolean {
  return actor?.role === "super_admin" && actor.id !== target.id && target.role !== "super_admin" && target.role !== newRole
}

export function getAuthScreen(status: AuthStatus, user: AuthUser | null): "loading" | "auth" | "app" | "unavailable" {
  if (status === "unavailable") return "unavailable"
  if (status === "loading") return "loading"
  return user ? "app" : "auth"
}

export function getAuthErrorMessage(message: string | undefined, locale: AppLocale = getCurrentLocale()): string {
  const source = message?.toLowerCase() ?? ""
  if (source.includes("invalid login credentials")) return translate(locale, "auth.invalidCredentials")
  if (source.includes("already registered") || source.includes("already been registered")) return translate(locale, "auth.alreadyRegistered")
  if (source.includes("email not confirmed") || source.includes("email confirmation")) return translate(locale, "auth.emailNotConfirmed")
  if (source.includes("network") || source.includes("fetch")) return translate(locale, "auth.networkFailed")
  if (source.includes("permission") || source.includes("row-level security")) return translate(locale, "auth.noPermission")
  return message || translate(locale, "common.error")
}
