export const APP_ROLES = ["user", "admin", "super_admin"] as const

export type AppRole = (typeof APP_ROLES)[number]
export type ProfileCohortYear = 2024 | 2025

export interface AuthUser {
  id: string
  email: string | null
}

export interface Profile {
  id: string
  username: string
  avatarUrl: string | null
  role: AppRole
  cohortYear: ProfileCohortYear | null
  createdAt: string
}

export type AuthStatus = "loading" | "anonymous" | "authenticated" | "unavailable"
