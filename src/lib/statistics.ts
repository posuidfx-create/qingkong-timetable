import { getCourseConflicts, getCourseConflictsForWeek } from "@/lib/conflict"
import { getCoursesForWeek } from "@/lib/timetable"
import { isTodoOverdue } from "@/lib/todo"
import type { Course, DayOfWeek, Todo } from "@/types/timetable"

export interface WeekLoad { week: number; items: number; sections: number }
export interface TodoStats { total: number; completed: number; remaining: number; overdue: number; completionRate?: number }

const days: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7]
const span = (course: Course) => course.endSection - course.startSection + 1

export const getUniqueCourseCount = (courses: readonly Course[]) => new Set(courses.map((course) => course.name.trim()).filter(Boolean)).size
export const getCourseItemCount = (courses: readonly Course[]) => courses.length
export function getCurrentWeekStats(courses: readonly Course[], week: number) {
  const current = getCoursesForWeek(courses, week)
  return { items: current.length, sections: current.reduce((sum, course) => sum + span(course), 0), activeDays: new Set(current.map((course) => course.dayOfWeek)).size }
}
export function getWeeklyCourseStats(courses: readonly Course[], totalWeeks: number): WeekLoad[] {
  return Array.from({ length: Math.max(0, totalWeeks) }, (_, index) => {
    const current = getCoursesForWeek(courses, index + 1)
    return { week: index + 1, items: current.length, sections: current.reduce((sum, course) => sum + span(course), 0) }
  })
}
export function getWeekdayCourseLoad(courses: readonly Course[]): Record<DayOfWeek, number> {
  const result = Object.fromEntries(days.map((day) => [day, 0])) as Record<DayOfWeek, number>
  courses.forEach((course) => { result[course.dayOfWeek] += span(course) * new Set(course.weeks).size })
  return result
}
export function getBusiestWeekday(load: Record<DayOfWeek, number>): { dayOfWeek: DayOfWeek; sections: number } | undefined {
  const best = days.reduce((current, day) => load[day] > load[current] ? day : current, 1 as DayOfWeek)
  return load[best] > 0 ? { dayOfWeek: best, sections: load[best] } : undefined
}
export function getTodoStats(todos: readonly Todo[], now: Date): TodoStats {
  const completed = todos.filter((todo) => todo.completed).length
  const total = todos.length
  return { total, completed, remaining: total - completed, overdue: todos.filter((todo) => isTodoOverdue(todo, now)).length, ...(total ? { completionRate: Math.round((completed / total) * 100) } : {}) }
}
export function getConflictStats(courses: readonly Course[], week: number) { return { semester: getCourseConflicts(courses).length, currentWeek: getCourseConflictsForWeek(courses, week).length } }
