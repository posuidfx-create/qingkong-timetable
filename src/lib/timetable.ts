import { MAX_SECTION_NUMBER } from "@/lib/defaults"
import type { Course, DayOfWeek } from "@/types/timetable"

export function isCourseActiveInWeek(course: Course, week: number): boolean {
  return Number.isInteger(week) && week > 0 && course.weeks.includes(week)
}

export function getCoursesForWeek(
  courses: readonly Course[],
  week: number,
): Course[] {
  return courses.filter((course) => isCourseActiveInWeek(course, week))
}

export function getCoursesForDay(
  courses: readonly Course[],
  dayOfWeek: DayOfWeek,
): Course[] {
  return courses.filter((course) => course.dayOfWeek === dayOfWeek)
}

export function isValidSectionRange(
  startSection: number,
  endSection: number,
  maxSection: number = MAX_SECTION_NUMBER,
): boolean {
  return (
    Number.isInteger(startSection) &&
    Number.isInteger(endSection) &&
    Number.isInteger(maxSection) &&
    maxSection >= 1 &&
    startSection >= 1 &&
    startSection <= endSection &&
    endSection <= maxSection
  )
}
