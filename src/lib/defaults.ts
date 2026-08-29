import type {
  ApplicationSettings,
  SectionNumber,
  SectionTime,
  Semester,
} from "@/types/timetable"

export const MAX_SECTION_NUMBER: SectionNumber = 11

export const DEFAULT_SECTION_TIMES = [
  { section: 1, startTime: "08:00", endTime: "08:45" },
  { section: 2, startTime: "08:55", endTime: "09:40" },
  { section: 3, startTime: "10:00", endTime: "10:45" },
  { section: 4, startTime: "10:55", endTime: "11:40" },
  { section: 5, startTime: "13:20", endTime: "14:05" },
  { section: 6, startTime: "14:15", endTime: "15:00" },
  { section: 7, startTime: "15:20", endTime: "16:05" },
  { section: 8, startTime: "16:15", endTime: "17:00" },
  { section: 9, startTime: "18:00", endTime: "18:45" },
  { section: 10, startTime: "18:55", endTime: "19:40" },
  { section: 11, startTime: "19:50", endTime: "20:35" },
] as const satisfies readonly SectionTime[]

export const DEFAULT_APPLICATION_SETTINGS: ApplicationSettings = {
  theme: "system",
  weekStartsOn: 1,
  showWeekends: false,
  compactCourseCards: false,
  showDemoCourses: true,
}

/**
 * Explicit placeholder semester used until the user configures their actual
 * academic calendar. The start date is deliberately not derived from today.
 */
export const DEFAULT_SEMESTER: Semester = {
  id: "default-2026-autumn",
  name: "2026 秋季学期",
  startDate: "2026-08-31",
  endDate: "2027-01-17",
  totalWeeks: 20,
}

export function getSectionTime(section: SectionNumber): SectionTime | undefined {
  return DEFAULT_SECTION_TIMES.find((item) => item.section === section)
}
