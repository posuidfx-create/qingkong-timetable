import { describe, expect, it } from "vitest"

import { buildAdminTodoCreateRow, buildAdminTodoInsertRow } from "@/lib/adminTodo"
import type { AdminTodoDraft } from "@/types/adminTodo"

const draft: AdminTodoDraft = { title: "  这是一个测试  ", description: "说明", dueAt: "2026-09-01T00:00:00.000Z", targetType: "all", targetCohort: null, userIds: [], attachments: [], removedAttachmentIds: [] }

describe("admin todo create row", () => {
  it("maps a new todo to explicit snake_case columns with the real auth user id", () => {
    expect(buildAdminTodoCreateRow(draft, "auth-user-id")).toEqual({ title: "这是一个测试", description: "说明", due_at: "2026-09-01T00:00:00.000Z", target_type: "all", target_cohort: null, created_by: "auth-user-id" })
  })
  it("does not allow a missing auth user id to reach Supabase", () => {
    expect(() => buildAdminTodoCreateRow(draft, "")).toThrow("登录状态已失效")
  })
  it("keeps a cohort target only for cohort todos", () => {
    expect(buildAdminTodoCreateRow({ ...draft, targetType: "cohort", targetCohort: 2025 }, "auth-user-id").target_cohort).toBe(2025)
    expect(buildAdminTodoCreateRow({ ...draft, targetType: "all", targetCohort: 2025 }, "auth-user-id").target_cohort).toBeNull()
  })
  it("uses one explicit id for the pure insert followed by its select", () => {
    expect(buildAdminTodoInsertRow(draft, "auth-user-id", "todo-id")).toMatchObject({ id: "todo-id", created_by: "auth-user-id" })
  })
})
