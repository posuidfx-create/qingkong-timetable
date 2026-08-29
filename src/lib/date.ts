import {
  addDays,
  addWeeks,
  differenceInCalendarWeeks,
  endOfDay,
  isValid,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns"

import type { Semester } from "@/types/timetable"

export interface SemesterWeekDateRange {
  start: Date
  end: Date
}

function getSemesterFirstWeekStart(semester: Semester): Date | undefined {
  const startDate = parseISO(semester.startDate)
  if (!isValid(startDate)) return undefined

  return startOfWeek(startDate, { weekStartsOn: 1 })
}

/**
 * Returns 0 before the semester's first teaching week and totalWeeks + 1 after
 * its last teaching week. This keeps "not started" and "finished" distinct.
 */
export function getCurrentSemesterWeek(
  semester: Semester,
  date: Date,
): number {
  const firstWeekStart = getSemesterFirstWeekStart(semester)
  if (!firstWeekStart || !isValid(date) || semester.totalWeeks < 1) return 0

  const currentWeekStart = startOfWeek(date, { weekStartsOn: 1 })
  const week =
    differenceInCalendarWeeks(currentWeekStart, firstWeekStart, { weekStartsOn: 1 }) + 1

  if (week < 1) return 0
  if (week > semester.totalWeeks) return semester.totalWeeks + 1
  return week
}

export function getSemesterWeekDateRange(
  semester: Semester,
  weekNumber: number,
): SemesterWeekDateRange | undefined {
  const firstWeekStart = getSemesterFirstWeekStart(semester)
  if (
    !firstWeekStart ||
    !Number.isInteger(weekNumber) ||
    weekNumber < 1 ||
    weekNumber > semester.totalWeeks
  ) {
    return undefined
  }

  const start = startOfDay(addWeeks(firstWeekStart, weekNumber - 1))
  return {
    start,
    end: endOfDay(addDays(start, 6)),
  }
}
