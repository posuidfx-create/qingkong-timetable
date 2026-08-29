import { addDays, format, getDate, isSameDay } from "date-fns"

import { getCourseConflicts } from "@/lib/conflict"
import { getSemesterWeekDateRange } from "@/lib/date"
import { isValidSectionRange } from "@/lib/timetable"
import type { Course, DayOfWeek, Semester } from "@/types/timetable"

export interface WeekDayView {
  dayOfWeek: DayOfWeek
  label: string
  date: number
  fullDate: Date
  isToday: boolean
}

export interface CourseLayout {
  course: Course
  lane: number
  laneCount: number
  hasConflict: boolean
}

const WEEKDAY_LABELS: Record<DayOfWeek, string> = {
  1: "周一",
  2: "周二",
  3: "周三",
  4: "周四",
  5: "周五",
  6: "周六",
  7: "周日",
}

export const COURSE_COLOR_PALETTE = [
  "#789A88",
  "#8795B5",
  "#9584AD",
  "#AE8978",
  "#7695A8",
  "#A28E72",
  "#A08088",
] as const

export function clampWeekToSemester(week: number, totalWeeks: number): number {
  if (!Number.isInteger(week) || !Number.isInteger(totalWeeks) || totalWeeks < 1) return 1
  return Math.min(Math.max(week, 1), totalWeeks)
}

export function getVisibleDays(showWeekends: boolean): DayOfWeek[] {
  return showWeekends ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5]
}

export function getWeekDayViews(
  semester: Semester,
  week: number,
  showWeekends: boolean,
  today?: Date,
): WeekDayView[] {
  const range = getSemesterWeekDateRange(semester, week)
  if (!range) return []

  return getVisibleDays(showWeekends).map((dayOfWeek) => {
    const fullDate = addDays(range.start, dayOfWeek - 1)
    return {
      dayOfWeek,
      label: WEEKDAY_LABELS[dayOfWeek],
      date: getDate(fullDate),
      fullDate,
      isToday: today ? isSameDay(fullDate, today) : false,
    }
  })
}

export function formatSemesterWeekRange(semester: Semester, week: number): string {
  const range = getSemesterWeekDateRange(semester, week)
  if (!range) return "日期待设置"

  if (range.start.getFullYear() !== range.end.getFullYear()) {
    return `${format(range.start, "yyyy年M月d日")} - ${format(range.end, "yyyy年M月d日")}`
  }

  return `${format(range.start, "M月d日")} - ${format(range.end, "M月d日")}`
}

export function getStableCourseColor(course: Pick<Course, "color" | "id" | "name">): string {
  if (course.color.trim().length > 0) return course.color

  const key = course.name.trim() || course.id
  let hash = 0
  for (const character of key) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0
  }
  return COURSE_COLOR_PALETTE[hash % COURSE_COLOR_PALETTE.length]
}

function assignGroupLanes(group: readonly Course[], conflictIds: ReadonlySet<string>): CourseLayout[] {
  const laneEnds: number[] = []
  const assignments = group.map((course) => {
    let lane = laneEnds.findIndex((endSection) => endSection < course.startSection)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(course.endSection)
    } else {
      laneEnds[lane] = course.endSection
    }
    return { course, lane }
  })

  return assignments.map(({ course, lane }) => ({
    course,
    lane,
    laneCount: laneEnds.length,
    hasConflict: conflictIds.has(course.id),
  }))
}

export function getCourseLayouts(courses: readonly Course[]): CourseLayout[] {
  const validCourses = courses
    .filter((course) => isValidSectionRange(course.startSection, course.endSection))
    .slice()
    .sort(
      (left, right) =>
        left.dayOfWeek - right.dayOfWeek ||
        left.startSection - right.startSection ||
        left.endSection - right.endSection ||
        left.id.localeCompare(right.id),
    )
  const conflictIds = new Set(
    getCourseConflicts(validCourses).flatMap((conflict) => [
      conflict.courseAId,
      conflict.courseBId,
    ]),
  )
  const layouts: CourseLayout[] = []

  for (const dayOfWeek of getVisibleDays(true)) {
    const dayCourses = validCourses.filter((course) => course.dayOfWeek === dayOfWeek)
    let groupStart = 0

    while (groupStart < dayCourses.length) {
      let groupEnd = groupStart + 1
      let maximumEndSection: number = dayCourses[groupStart].endSection

      while (
        groupEnd < dayCourses.length &&
        dayCourses[groupEnd].startSection <= maximumEndSection
      ) {
        maximumEndSection = Math.max(maximumEndSection, dayCourses[groupEnd].endSection)
        groupEnd += 1
      }

      layouts.push(...assignGroupLanes(dayCourses.slice(groupStart, groupEnd), conflictIds))
      groupStart = groupEnd
    }
  }

  return layouts
}
