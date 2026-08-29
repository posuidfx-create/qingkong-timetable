import { describe, expect, it } from "vitest"

import { canAccessAdminTodo, canManageAdminTodos, getVisibleAdminTodoTabs } from "@/lib/adminTodo"
import type { Profile } from "@/types/auth"

const user24: Profile = { id: "24", username: "24同学", avatarUrl: null, role: "user", cohortYear: 2024, createdAt: "2026-01-01T00:00:00Z" }
const user25: Profile = { ...user24, id: "25", cohortYear: 2025 }
const admin: Profile = { ...user24, id: "admin", role: "admin" }
const allTodo = { targetType: "all" as const, targetCohort: null }
const cohort24Todo = { targetType: "cohort" as const, targetCohort: 2024 as const }
const usersTodo = { targetType: "users" as const, targetCohort: null }

describe("admin todo access", () => {
  it("keeps 24 and 25 cohort todos separated", () => {
    expect(canAccessAdminTodo(cohort24Todo, user24)).toBe(true)
    expect(canAccessAdminTodo(cohort24Todo, user25)).toBe(false)
  })
  it("allows all users to see all-target todos and only assigned users to see user-target todos", () => {
    expect(canAccessAdminTodo(allTodo, user24)).toBe(true)
    expect(canAccessAdminTodo(usersTodo, user24, ["24"])).toBe(true)
    expect(canAccessAdminTodo(usersTodo, user25, ["24"])).toBe(false)
  })
  it("allows admins to manage and see every tab", () => {
    expect(canManageAdminTodos(admin)).toBe(true)
    expect(canAccessAdminTodo(cohort24Todo, admin)).toBe(true)
    expect(getVisibleAdminTodoTabs(admin)).toEqual(["mine", "cohort_2024", "cohort_2025"])
  })
  it("keeps ordinary users on their own cohort tab", () => {
    expect(getVisibleAdminTodoTabs(user25)).toEqual(["mine", "cohort_2025"])
  })
})
