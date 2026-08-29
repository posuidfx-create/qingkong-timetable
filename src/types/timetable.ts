export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type SectionNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

export type ThemePreference = "light" | "dark" | "system"
export type CohortYear = 2024 | 2025

export interface Course {
  id: string
  name: string
  teacher?: string
  academicAdvisor?: string
  classroom?: string
  dayOfWeek: DayOfWeek
  startSection: SectionNumber
  endSection: SectionNumber
  weeks: number[]
  color: string
  note?: string
}

export interface Semester {
  id: string
  name: string
  startDate: string
  endDate: string
  totalWeeks: number
}

export interface SectionTime {
  section: SectionNumber
  startTime: string
  endTime: string
}

export type TodoType = "assignment" | "exam" | "course" | "other"

export interface Todo {
  id: string
  title: string
  type: TodoType
  completed: boolean
  courseId?: string
  dueAt?: string
  note?: string
  createdAt: string
}

export interface ApplicationSettings {
  theme: ThemePreference
  weekStartsOn: 1 | 7
  showWeekends: boolean
  compactCourseCards: boolean
  cohortYear?: CohortYear
  /** Legacy preference kept only so existing local data can be restored safely. */
  showDemoCourses?: boolean
  defaultSemesterId?: string
}
