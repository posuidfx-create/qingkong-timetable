export const APP_ROLES = ["user", "admin", "super_admin"] as const
export const PROFILE_IDENTITY_TYPES = ["student", "teacher"] as const

export type AppRole = (typeof APP_ROLES)[number]
export type ProfileIdentityType = (typeof PROFILE_IDENTITY_TYPES)[number]
export type ProfileCohortYear = 2024 | 2025

export interface AuthUser {
  id: string
  email: string | null
}

export interface Profile {
  id: string
  username: string
  title: string | null
  avatarUrl: string | null
  role: AppRole
  identityType: ProfileIdentityType | null
  cohortYear: ProfileCohortYear | null
  createdAt: string
}

export type AuthStatus = "loading" | "anonymous" | "authenticated" | "unavailable"
