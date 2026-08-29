import { describe, expect, it } from "vitest"

import { getCurrentSemesterWeek, getSemesterWeekDateRange } from "@/lib/date"
import type { Semester } from "@/types/timetable"

function createSemester(overrides: Partial<Semester> = {}): Semester {
  return {
    id: "semester-1",
    name: "测试学期",
    startDate: "2025-09-01",
    endDate: "2025-12-21",
    totalWeeks: 16,
    ...overrides,
  }
}

describe("getCurrentSemesterWeek", () => {
  it("开学日是星期一时当天属于第 1 周", () => {
    expect(getCurrentSemesterWeek(createSemester(), new Date(2025, 8, 1, 18, 30))).toBe(1)
  })

  it("开学日不是星期一时所在自然周仍为第 1 周", () => {
    const semester = createSemester({ startDate: "2025-09-03" })
    expect(getCurrentSemesterWeek(semester, new Date(2025, 8, 1, 9))).toBe(1)
    expect(getCurrentSemesterWeek(semester, new Date(2025, 8, 7, 23, 59))).toBe(1)
  })

  it("下一周星期一进入第 2 周", () => {
    expect(getCurrentSemesterWeek(createSemester(), new Date(2025, 8, 8, 0, 1))).toBe(2)
  })

  it("正确处理跨月", () => {
    const semester = createSemester({ startDate: "2025-01-29" })
    expect(getCurrentSemesterWeek(semester, new Date(2025, 1, 3))).toBe(2)
  })

  it("正确处理跨年", () => {
    const semester = createSemester({ startDate: "2025-12-31" })
    expect(getCurrentSemesterWeek(semester, new Date(2026, 0, 5))).toBe(2)
  })

  it("学期开始周之前返回 0", () => {
    expect(getCurrentSemesterWeek(createSemester(), new Date(2025, 7, 31, 23, 59))).toBe(0)
  })

  it("超过总周数后返回 totalWeeks + 1", () => {
    expect(getCurrentSemesterWeek(createSemester(), new Date(2025, 11, 22))).toBe(17)
  })

  it("日期包含时分秒不改变教学周", () => {
    const semester = createSemester()
    expect(getCurrentSemesterWeek(semester, new Date(2025, 8, 7, 23, 59, 59))).toBe(1)
  })
})

describe("getSemesterWeekDateRange", () => {
  it("返回星期一到星期日的第 1 周范围", () => {
    const range = getSemesterWeekDateRange(createSemester({ startDate: "2025-09-03" }), 1)
    expect(range?.start).toEqual(new Date(2025, 8, 1, 0, 0, 0, 0))
    expect(range?.end).toEqual(new Date(2025, 8, 7, 23, 59, 59, 999))
  })

  it("第 2 周范围与当前周算法使用相同边界", () => {
    const range = getSemesterWeekDateRange(createSemester(), 2)
    expect(range?.start).toEqual(new Date(2025, 8, 8, 0, 0, 0, 0))
    expect(range?.end).toEqual(new Date(2025, 8, 14, 23, 59, 59, 999))
  })

  it("拒绝学期范围外或非整数周次", () => {
    expect(getSemesterWeekDateRange(createSemester(), 0)).toBeUndefined()
    expect(getSemesterWeekDateRange(createSemester(), 17)).toBeUndefined()
    expect(getSemesterWeekDateRange(createSemester(), 1.5)).toBeUndefined()
  })
})
