import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { TimetableGrid } from "@/components/timetable/TimetableGrid"
import { DEMO_ROTATING_COURSES } from "@/lib/demoCourses"
import { DEFAULT_SECTION_TIMES, DEFAULT_SEMESTER } from "@/lib/defaults"
import { getCoursesForWeek } from "@/lib/timetable"
import {
  formatSemesterWeekRange,
  getCourseLayouts,
  getStableCourseColor,
  getVisibleDays,
  getWeekDayViews,
} from "@/lib/timetableView"
import type { Course, Semester } from "@/types/timetable"

function createCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: "course-1",
    name: "综合日语（三）",
    teacher: "丛莉",
    classroom: "A7-322",
    dayOfWeek: 1,
    startSection: 1,
    endSection: 2,
    weeks: [1, 2, 3],
    color: "#7695A8",
    ...overrides,
  }
}

describe("课程表 Demo 周次", () => {
  it("第 3 周只显示环境设计", () => {
    expect(getCoursesForWeek(DEMO_ROTATING_COURSES, 3).map((course) => course.name)).toEqual([
      "环境设计",
    ])
  })

  it("第 11 周只显示视觉设计", () => {
    expect(getCoursesForWeek(DEMO_ROTATING_COURSES, 11).map((course) => course.name)).toEqual([
      "视觉设计",
    ])
  })

  it("第 14 周只显示角色造型", () => {
    expect(getCoursesForWeek(DEMO_ROTATING_COURSES, 14).map((course) => course.name)).toEqual([
      "角色造型",
    ])
  })
})

describe("课程表视图模型", () => {
  it("showWeekends 决定显示五天或七天", () => {
    expect(getVisibleDays(false)).toEqual([1, 2, 3, 4, 5])
    expect(getVisibleDays(true)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it("只有查看真实当前周时才标记今天", () => {
    const today = new Date(2026, 7, 31)
    const highlighted = getWeekDayViews(DEFAULT_SEMESTER, 1, false, today)
    const notHighlighted = getWeekDayViews(DEFAULT_SEMESTER, 1, false)

    expect(highlighted[0]).toMatchObject({ label: "周一", date: 31, isToday: true })
    expect(notHighlighted.every((day) => !day.isToday)).toBe(true)
  })

  it("跨年日期范围包含两端年份", () => {
    const semester: Semester = {
      ...DEFAULT_SEMESTER,
      startDate: "2026-12-30",
      endDate: "2027-05-16",
    }
    expect(formatSemesterWeekRange(semester, 1)).toBe("2026年12月28日 - 2027年1月3日")
  })

  it("空颜色按课程身份生成稳定颜色", () => {
    const course = createCourse({ color: "" })
    expect(getStableCourseColor(course)).toBe(getStableCourseColor({ ...course }))
  })

  it("真正冲突的课程获得不同分栏和非颜色提示状态", () => {
    const layouts = getCourseLayouts([
      createCourse({ id: "course-a" }),
      createCourse({ id: "course-b", startSection: 2, endSection: 3 }),
    ])

    expect(layouts).toHaveLength(2)
    expect(layouts.map((layout) => layout.lane).sort()).toEqual([0, 1])
    expect(layouts.every((layout) => layout.laneCount === 2 && layout.hasConflict)).toBe(true)
  })
})

describe("TimetableGrid 关键渲染", () => {
  const days = getWeekDayViews(DEFAULT_SEMESTER, 1, false)

  it("多节课程只渲染一张连续课程卡", () => {
    const markup = renderToStaticMarkup(
      createElement(TimetableGrid, {
        courses: [createCourse({ startSection: 5, endSection: 8 })],
        days,
        sectionTimes: DEFAULT_SECTION_TIMES,
      }),
    )

    expect(markup.match(/data-course-id="course-1"/g)).toHaveLength(1)
    expect(markup).toContain("grid-row:6 / 10")
  })

  it("无课程时显示自然空状态", () => {
    const markup = renderToStaticMarkup(
      createElement(TimetableGrid, {
        courses: [],
        days,
        sectionTimes: DEFAULT_SECTION_TIMES,
      }),
    )
    expect(markup).toContain("本周暂无课程")
    expect(markup).toContain("grid-template-rows:3.5rem")
    expect(markup).not.toContain("grid-template-rows:3.5rem repeat(11")
  })
})
