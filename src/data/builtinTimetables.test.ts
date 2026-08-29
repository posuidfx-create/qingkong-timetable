import { describe, expect, it } from "vitest"

import { coursesConflict } from "@/lib/conflict"
import { getCourseItemCount, getUniqueCourseCount } from "@/lib/statistics"
import {
  BUILTIN_COHORT_24,
  BUILTIN_COHORT_25,
  getBuiltinCourses,
  getVisibleCourses,
  isBuiltinCourse,
} from "@/data/builtinTimetables"
import type { Course } from "@/types/timetable"

const userCourse: Course = {
  id: "manual-course",
  name: "我的补充课程",
  dayOfWeek: 1,
  startSection: 1,
  endSection: 2,
  weeks: [1],
  color: "#d9879d",
}

describe("builtinTimetables", () => {
  it("真实 24 级内置课表含 8 个课程项", () => {
    expect(BUILTIN_COHORT_24).toHaveLength(8)
    expect(getBuiltinCourses(2024)).toHaveLength(8)
  })

  it("真实 25 级内置课表含 25 个课程项与 9 门课程", () => {
    expect(BUILTIN_COHORT_25).toHaveLength(25)
    expect(getCourseItemCount(getBuiltinCourses(2025))).toBe(25)
    expect(getUniqueCourseCount(getBuiltinCourses(2025))).toBe(9)
  })

  it("切换年级返回不同的稳定内置课程 ID", () => {
    const first = getBuiltinCourses(2025)
    const second = getBuiltinCourses(2025)
    expect(first.map((course) => course.id)).toEqual(second.map((course) => course.id))
    expect(first.every(isBuiltinCourse)).toBe(true)
    expect(getBuiltinCourses(2024).map((course) => course.id)).not.toEqual(first.map((course) => course.id))
  })

  it("内置课程与用户课程合并，切换年级不会删除用户课程", () => {
    expect(getVisibleCourses(2024, [userCourse])).toContainEqual(userCourse)
    expect(getVisibleCourses(2025, [userCourse])).toContainEqual(userCourse)
    expect(getVisibleCourses(undefined, [userCourse])).toEqual([userCourse])
  })

  it("用户课程仍会与当前年级内置课程参与冲突检测", () => {
    const builtin = getBuiltinCourses(2025).find((course) => course.name === "大学生就业指导")
    if (!builtin) throw new Error("未找到内置验收课程")
    expect(coursesConflict(builtin, userCourse)).toBe(true)
  })
})
