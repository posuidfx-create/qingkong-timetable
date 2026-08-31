import { describe, expect, it } from "vitest"

import { canChangeUserRole, canEditOwnProfile, canEditUserProfile, canManageRole, getAuthErrorMessage, getAuthScreen, getRoleLabel, parseProfile } from "@/lib/auth"
import type { Profile } from "@/types/auth"

const user: Profile = { id: "user-1", username: "同学", title: null, avatarUrl: null, role: "user", identityType: "student", cohortYear: 2024, createdAt: "2026-08-29T00:00:00.000Z" }
const admin: Profile = { ...user, id: "admin-1", role: "admin" }
const superAdmin: Profile = { ...user, id: "super-1", role: "super_admin" }

describe("auth helpers", () => {
  it("parses a valid profile and rejects invalid roles", () => {
    expect(parseProfile({ id: "a", username: "晴空", title: null, avatar_url: null, role: "admin", cohort_year: 2025, created_at: "2026-08-29T00:00:00.000Z" })).toMatchObject({ username: "晴空", role: "admin", cohortYear: 2025 })
    expect(parseProfile({ id: "a", username: "晴空", avatar_url: null, role: "owner", created_at: "date" })).toBeNull()
  })

  it("parses student and teacher identities while keeping legacy profiles compatible", () => {
    const base = { id: "a", username: "用户", title: null, avatar_url: null, role: "user", created_at: "2026-08-29T00:00:00.000Z" }
    expect(parseProfile({ ...base, identity_type: "student", cohort_year: 2024 })).toMatchObject({ identityType: "student", cohortYear: 2024 })
    expect(parseProfile({ ...base, identity_type: "teacher", cohort_year: null })).toMatchObject({ identityType: "teacher", cohortYear: null })
    expect(parseProfile({ ...base, cohort_year: null })).toMatchObject({ identityType: null, cohortYear: null })
    expect(parseProfile({ ...base, identity_type: "teacher", cohort_year: 2024 })).toBeNull()
  })

  it("only allows a super administrator to manage ordinary users or admins", () => {
    expect(canManageRole(superAdmin, user)).toBe(true)
    expect(canManageRole(superAdmin, admin)).toBe(true)
    expect(canManageRole(admin, user)).toBe(false)
    expect(canManageRole(superAdmin, superAdmin)).toBe(false)
  })

  it("allows only a super admin to switch user and admin roles", () => {
    expect(canChangeUserRole(superAdmin, user, "admin")).toBe(true)
    expect(canChangeUserRole(superAdmin, admin, "user")).toBe(true)
    expect(canChangeUserRole(admin, user, "admin")).toBe(false)
    expect(canChangeUserRole(user, user, "admin")).toBe(false)
  })

  it("limits profile edits by actor and target role", () => {
    expect(canEditUserProfile(admin, user)).toBe(true)
    expect(canEditUserProfile(admin, superAdmin)).toBe(false)
    expect(canEditUserProfile(superAdmin, admin)).toBe(true)
    expect(canEditUserProfile(superAdmin, superAdmin)).toBe(false)
  })

  it("allows every authenticated role to edit its own display fields", () => {
    expect(canEditOwnProfile(user)).toBe(true)
    expect(canEditOwnProfile(admin)).toBe(true)
    expect(canEditOwnProfile(superAdmin)).toBe(true)
    expect(canEditOwnProfile(null)).toBe(false)
  })

  it("translates an unconfirmed-email login error", () => {
    expect(getAuthErrorMessage("Email not confirmed")).toContain("Confirm email address")
  })

  it("uses Chinese role labels", () => {
    expect(getRoleLabel("user")).toBe("用户")
    expect(getRoleLabel("admin")).toBe("管理员")
    expect(getRoleLabel("super_admin")).toBe("超级管理员")
  })

  it("keeps authentication UI states deterministic", () => {
    expect(getAuthScreen("loading", null)).toBe("loading")
    expect(getAuthScreen("anonymous", null)).toBe("auth")
    expect(getAuthScreen("authenticated", { id: "u", email: null })).toBe("app")
    expect(getAuthScreen("unavailable", null)).toBe("unavailable")
  })
})
