import { getCoursesForWeek, isValidSectionRange } from "@/lib/timetable"
import type { Course } from "@/types/timetable"

export interface CourseConflict {
  courseAId: string
  courseBId: string
  overlappingWeeks: number[]
  startSection: number
  endSection: number
}

export interface CourseConflictMatch {
  course: Course
  overlappingWeeks: number[]
  startSection: number
  endSection: number
}

function getOverlappingWeeks(courseA: Course, courseB: Course): number[] {
  const courseBWeeks = new Set(courseB.weeks)
  return [...new Set(courseA.weeks)]
    .filter((week) => courseBWeeks.has(week))
    .sort((left, right) => left - right)
}

function toCourseConflict(courseA: Course, courseB: Course): CourseConflict | undefined {
  if (courseA.id === courseB.id || courseA.dayOfWeek !== courseB.dayOfWeek) {
    return undefined
  }

  if (
    !isValidSectionRange(courseA.startSection, courseA.endSection) ||
    !isValidSectionRange(courseB.startSection, courseB.endSection)
  ) {
    return undefined
  }

  const startSection = Math.max(courseA.startSection, courseB.startSection)
  const endSection = Math.min(courseA.endSection, courseB.endSection)
  if (startSection > endSection) return undefined

  const overlappingWeeks = getOverlappingWeeks(courseA, courseB)
  if (overlappingWeeks.length === 0) return undefined

  return {
    courseAId: courseA.id,
    courseBId: courseB.id,
    overlappingWeeks,
    startSection,
    endSection,
  }
}

export function coursesConflict(courseA: Course, courseB: Course): boolean {
  return toCourseConflict(courseA, courseB) !== undefined
}

export function getCourseConflicts(courses: readonly Course[]): CourseConflict[] {
  const conflicts: CourseConflict[] = []

  for (let leftIndex = 0; leftIndex < courses.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < courses.length; rightIndex += 1) {
      const conflict = toCourseConflict(courses[leftIndex], courses[rightIndex])
      if (conflict) conflicts.push(conflict)
    }
  }

  return conflicts
}

/**
 * Returns only conflicts that can actually happen in the specified teaching week.
 * Keeping this at the domain layer prevents cards and detail sheets from treating
 * courses with mutually exclusive week sets as simultaneous conflicts.
 */
export function getCourseConflictsForWeek(
  courses: readonly Course[],
  week: number,
): CourseConflict[] {
  return getCourseConflicts(getCoursesForWeek(courses, week))
}

export function getConflictsForCourse(
  courses: readonly Course[],
  courseId: string,
  week?: number,
): CourseConflictMatch[] {
  const availableCourses = week === undefined ? courses : getCoursesForWeek(courses, week)
  const coursesById = new Map(availableCourses.map((course) => [course.id, course]))

  return getCourseConflicts(availableCourses).flatMap((conflict) => {
    const conflictingCourseId =
      conflict.courseAId === courseId
        ? conflict.courseBId
        : conflict.courseBId === courseId
          ? conflict.courseAId
          : undefined
    const course = conflictingCourseId ? coursesById.get(conflictingCourseId) : undefined
    return course
      ? [{
          course,
          overlappingWeeks: conflict.overlappingWeeks,
          startSection: conflict.startSection,
          endSection: conflict.endSection,
        }]
      : []
  })
}
