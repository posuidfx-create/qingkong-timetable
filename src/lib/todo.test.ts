import { describe, expect, it } from "vitest"

import { formatTodoDueDate, getTodayTodos, isTodoOverdue, sortTodos } from "@/lib/todo"
import type { Todo } from "@/types/timetable"

const now = new Date("2026-09-01T12:00:00+08:00")

function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: "todo-1",
    title: "完成作业",
    type: "assignment",
    completed: false,
    createdAt: "2026-08-31T08:00:00.000Z",
    ...overrides,
  }
}

describe("Todo 时间与排序", () => {
  it("未完成、有截止时间的待办优先按时间排序，无截止时间与已完成靠后", () => {
    expect(
      sortTodos([
        todo({ id: "done", completed: true, dueAt: "2026-08-31T10:00:00+08:00" }),
        todo({ id: "none" }),
        todo({ id: "late", dueAt: "2026-09-02T10:00:00+08:00" }),
        todo({ id: "early", dueAt: "2026-09-01T13:00:00+08:00" }),
      ]).map((item) => item.id),
    ).toEqual(["early", "late", "none", "done"])
  })

  it("今天待办仅包含今天截止且未完成的项目", () => {
    const todos = [
      todo({ id: "today", dueAt: "2026-09-01T18:00:00+08:00" }),
      todo({ id: "tomorrow", dueAt: "2026-09-02T09:00:00+08:00" }),
      todo({ id: "done", completed: true, dueAt: "2026-09-01T13:00:00+08:00" }),
      todo({ id: "none" }),
    ]
    expect(getTodayTodos(todos, now).map((item) => item.id)).toEqual(["today"])
  })

  it("已完成项目不算逾期，未完成且已过截止时间才算", () => {
    expect(isTodoOverdue(todo({ dueAt: "2026-09-01T11:00:00+08:00" }), now)).toBe(true)
    expect(isTodoOverdue(todo({ completed: true, dueAt: "2026-09-01T11:00:00+08:00" }), now)).toBe(false)
    expect(isTodoOverdue(todo(), now)).toBe(false)
  })

  it("统一格式化今天、明天和跨年截止时间", () => {
    expect(formatTodoDueDate("2026-09-01T18:00:00+08:00", now)).toBe("今天 18:00")
    expect(formatTodoDueDate("2026-09-02T09:00:00+08:00", now)).toBe("明天 09:00")
    expect(formatTodoDueDate("2027-01-03T09:00:00+08:00", now)).toBe("2027年1月3日 09:00")
  })
})
