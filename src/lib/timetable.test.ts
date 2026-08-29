import { describe, expect, it } from "vitest"

import {
  getCoursesForDay,
  getCoursesForWeek,
  isCourseActiveInWeek,
  isValidSectionRange,
} from "@/lib/timetable"
import type { Course } from "@/types/timetable"

const course: Course = {
  id: "environment-design",
  name: "环境设计",
  teacher: "冈田庸平",
  academicAdvisor: "王词光",
  classroom: "A7-322",
  dayOfWeek: 1,
  startSection: 5,
  endSection: 8,
  weeks: [2, 3, 4, 5],
  color: "#5b8def",
}

describe("课程周次过滤", () => {
  it("当前周课程显示", () => {
    expect(isCourseActiveInWeek(course, 4)).toBe(true)
  })

  it("非当前周课程隐藏", () => {
    expect(isCourseActiveInWeek(course, 6)).toBe(false)
  })

  it("非法教学周不显示课程", () => {
    expect(isCourseActiveInWeek(course, 0)).toBe(false)
    expect(isCourseActiveInWeek(course, 2.5)).toBe(false)
  })

  it("按指定周过滤多周课程", () => {
    const otherCourse = { ...course, id: "visual-design", weeks: [10, 11, 12] }
    expect(getCoursesForWeek([course, otherCourse], 3)).toEqual([course])
  })

  it("按星期过滤课程且不读取外部状态", () => {
    const tuesdayCourse: Course = { ...course, id: "tuesday", dayOfWeek: 2 }
    expect(getCoursesForDay([course, tuesdayCourse], 2)).toEqual([tuesdayCourse])
  })
})

describe("isValidSectionRange", () => {
  it.each([
    [1, 2],
    [5, 8],
    [3, 3],
    [10, 11],
  ])("接受合法节次 %i-%i", (startSection, endSection) => {
    expect(isValidSectionRange(startSection, endSection)).toBe(true)
  })

  it.each([
    [8, 5],
    [0, 2],
    [10, 12],
    [1.5, 2],
  ])("拒绝非法节次 %s-%s", (startSection, endSection) => {
    expect(isValidSectionRange(startSection, endSection)).toBe(false)
  })

  it("支持调用方指定每天最大节次数", () => {
    expect(isValidSectionRange(1, 8, 8)).toBe(true)
    expect(isValidSectionRange(1, 9, 8)).toBe(false)
  })
})
