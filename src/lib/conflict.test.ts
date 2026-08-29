import { describe, expect, it } from "vitest"

import {
  coursesConflict,
  getConflictsForCourse,
  getCourseConflicts,
  getCourseConflictsForWeek,
} from "@/lib/conflict"
import type { Course } from "@/types/timetable"

function createCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: "course-a",
    name: "课程 A",
    dayOfWeek: 1,
    startSection: 1,
    endSection: 2,
    weeks: [1, 2, 3, 4, 5, 6, 7, 8],
    color: "#5b8def",
    ...overrides,
  }
}

const environmentDesign = createCourse({
  id: "environment-design",
  name: "环境设计",
  teacher: "冈田庸平",
  academicAdvisor: "王词光",
  classroom: "A7-322",
  startSection: 5,
  endSection: 8,
  weeks: [2, 3, 4, 5],
})

const visualDesign = createCourse({
  id: "visual-design",
  name: "视觉设计",
  teacher: "小山贤一",
  academicAdvisor: "范迎南",
  classroom: "A7-322",
  startSection: 5,
  endSection: 8,
  weeks: [10, 11, 12],
})

const characterDesign = createCourse({
  id: "character-design",
  name: "角色造型",
  teacher: "吉松大志",
  academicAdvisor: "曹文瑞",
  classroom: "A7-322",
  startSection: 5,
  endSection: 8,
  weeks: [13, 14, 15, 16],
})

describe("coursesConflict", () => {
  it("检测完全重叠", () => {
    const courseA = createCourse()
    const courseB = createCourse({ id: "course-b" })
    expect(coursesConflict(courseA, courseB)).toBe(true)
  })

  it("检测部分节次重叠", () => {
    const courseB = createCourse({ id: "course-b", startSection: 2, endSection: 3 })
    expect(coursesConflict(createCourse(), courseB)).toBe(true)
  })

  it("检测只有一个节次重叠", () => {
    const courseB = createCourse({ id: "course-b", startSection: 2, endSection: 2 })
    expect(coursesConflict(createCourse(), courseB)).toBe(true)
  })

  it("不同星期不冲突", () => {
    const courseB = createCourse({ id: "course-b", dayOfWeek: 2 })
    expect(coursesConflict(createCourse(), courseB)).toBe(false)
  })

  it("不同周次不冲突", () => {
    const courseB = createCourse({ id: "course-b", weeks: [9, 10] })
    expect(coursesConflict(createCourse(), courseB)).toBe(false)
  })

  it("不同节次不冲突", () => {
    const courseB = createCourse({ id: "course-b", startSection: 3, endSection: 4 })
    expect(coursesConflict(createCourse(), courseB)).toBe(false)
  })

  it("真实 Excel 中同时间但不同周次的三门课程互不冲突", () => {
    expect(coursesConflict(environmentDesign, visualDesign)).toBe(false)
    expect(coursesConflict(environmentDesign, characterDesign)).toBe(false)
    expect(coursesConflict(visualDesign, characterDesign)).toBe(false)
  })

  it("课程不与自身冲突", () => {
    expect(coursesConflict(environmentDesign, environmentDesign)).toBe(false)
  })
})

describe("getCourseConflicts", () => {
  it("返回重叠周次和节次范围", () => {
    const courseA = createCourse({ weeks: [1, 2, 3, 4] })
    const courseB = createCourse({
      id: "course-b",
      startSection: 2,
      endSection: 4,
      weeks: [3, 4, 5],
    })

    expect(getCourseConflicts([courseA, courseB])).toEqual([
      {
        courseAId: "course-a",
        courseBId: "course-b",
        overlappingWeeks: [3, 4],
        startSection: 2,
        endSection: 2,
      },
    ])
  })

  it("检测多个课程冲突", () => {
    const courseA = createCourse()
    const courseB = createCourse({ id: "course-b" })
    const courseC = createCourse({ id: "course-c" })
    expect(getCourseConflicts([courseA, courseB, courseC])).toHaveLength(3)
  })

  it("不比较自身且不重复返回 A-B 与 B-A", () => {
    const courseA = createCourse()
    const courseB = createCourse({ id: "course-b" })
    const conflicts = getCourseConflicts([courseA, courseB])
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject({ courseAId: "course-a", courseBId: "course-b" })
  })

  it("忽略重复 ID，避免同一课程记录与自身比较", () => {
    const duplicate = { ...createCourse(), name: "重复记录" }
    expect(getCourseConflicts([createCourse(), duplicate])).toEqual([])
  })

  it("真实 Excel 三门分周课程不会产生冲突详情", () => {
    expect(getCourseConflicts([environmentDesign, visualDesign, characterDesign])).toEqual([])
  })
})

describe("getCourseConflictsForWeek", () => {
  it("只返回当前教学周实际发生的冲突", () => {
    const courseA = createCourse({ weeks: [1, 2, 3, 4] })
    const courseB = createCourse({ id: "course-b", weeks: [3, 4, 5, 6] })

    expect(getCourseConflictsForWeek([courseA, courseB], 2)).toEqual([])
    expect(getCourseConflictsForWeek([courseA, courseB], 3)).toHaveLength(1)
    expect(getCourseConflictsForWeek([courseA, courseB], 5)).toEqual([])
  })

  it("真实 Excel 的分周设计课程在任意周都不显示冲突", () => {
    const courses = [environmentDesign, visualDesign, characterDesign]
    expect(getCourseConflictsForWeek(courses, 3)).toEqual([])
    expect(getCourseConflictsForWeek(courses, 11)).toEqual([])
    expect(getCourseConflictsForWeek(courses, 14)).toEqual([])
  })

  it("为课程详情返回当前周的冲突课程与重叠信息", () => {
    const courseA = createCourse({ id: "detail-a", weeks: [1, 2, 3] })
    const courseB = createCourse({ id: "detail-b", name: "冲突课程", weeks: [2, 3, 4] })

    expect(getConflictsForCourse([courseA, courseB], "detail-a", 1)).toEqual([])
    expect(getConflictsForCourse([courseA, courseB], "detail-a", 2)).toEqual([
      {
        course: courseB,
        overlappingWeeks: [2, 3],
        startSection: 1,
        endSection: 2,
      },
    ])
  })
})
