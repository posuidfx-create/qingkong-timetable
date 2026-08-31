import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { TimetableGrid } from "@/components/timetable/TimetableGrid"
import { TimetableHeader } from "@/components/timetable/TimetableHeader"
import { TimetableWorkspaceAside } from "@/components/workspace/TimetableWorkspaceAside"
import { DEMO_ROTATING_COURSES } from "@/lib/demoCourses"
import { DEFAULT_SECTION_TIMES, DEFAULT_SEMESTER } from "@/lib/defaults"
import { getCoursesForWeek } from "@/lib/timetable"
import {
  formatSemesterWeekRange,
  getCourseLayouts,
  getStableCourseColor,
  getVisibleDays,
  getWeekDayViews,
  COURSE_COLOR_PALETTE,
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
  it("课程表使用水系档案色", () => {
    expect(COURSE_COLOR_PALETTE).toEqual(["#4EB6CE", "#7EBFD0", "#A9DCE7", "#28728A", "#6FAFC0"])
  })
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

  it("低节次课程只保留必要的未来节次视觉范围", () => {
    const markup = renderToStaticMarkup(
      createElement(TimetableGrid, {
        courses: [createCourse({ startSection: 1, endSection: 2 })],
        days,
        sectionTimes: DEFAULT_SECTION_TIMES,
      }),
    )

    expect(markup).toContain("--timetable-visible-sections:7")
    expect(markup).not.toContain("grid-row:12")
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

describe("课程表编辑式导航", () => {
  it("保留可点击周次、年级切换与原有周操作", () => {
    const markup = renderToStaticMarkup(createElement(TimetableHeader, {
      cohortYear: 2025,
      currentWeek: 1,
      currentWeekTarget: 1,
      dateRange: "8月31日 - 9月6日",
      onCohortChange: () => undefined,
      onGoToCurrentWeek: () => undefined,
      onImportExcel: () => undefined,
      onNextWeek: () => undefined,
      onPreviousWeek: () => undefined,
      onWeekChange: () => undefined,
      semesterName: "2026 秋季学期",
      totalWeeks: 20,
    }))

    expect(markup).toContain("努力也是一种天赋")
    expect(markup).toContain("查看第 20 周")
    expect(markup).toContain("查看上一周")
    expect(markup).toContain("查看下一周")
    expect(markup).toContain("24")
    expect(markup).toContain("25")
  })
})

describe("桌面学习工作台结构", () => {
  it("保留课程表主窗口与真实的学习、待办入口", () => {
    const markup = renderToStaticMarkup(createElement(TimetableWorkspaceAside, {
      focusedWindow: "main",
      onFocus: () => undefined,
      onOpenLearning: () => undefined,
      onOpenTodos: () => undefined,
      todayTodoCount: 2,
    }))

    expect(markup).toContain("TODAY")
    expect(markup).toContain("今日记录")
    expect(markup).toContain("今天还有 2 项待办")
    expect(markup).toContain("AI 学习助手")
  })

  it("辅助窗口保留可聚焦状态与学习目录入口", () => {
    const markup = renderToStaticMarkup(createElement(TimetableWorkspaceAside, {
      focusedWindow: "learning",
      onFocus: () => undefined,
      onOpenLearning: () => undefined,
      onOpenTodos: () => undefined,
      todayTodoCount: 0,
    }))

    expect(markup).toContain('data-focused="true"')
    expect(markup).toContain("01")
    expect(markup).toContain("02")
    expect(markup).toContain("03")
    expect(markup).toContain("今天的待办已处理")
  })
})
