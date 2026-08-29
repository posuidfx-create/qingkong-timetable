import { getConflictsForCourse, type CourseConflictMatch } from "@/lib/conflict"
import { isValidSectionRange } from "@/lib/timetable"
import { formatWeeks, parseWeekExpression } from "@/lib/weekParser"
import type {
  Course,
  DayOfWeek,
  SectionNumber,
  SectionTime,
} from "@/types/timetable"

export type WeekSelectionMode = "continuous" | "odd" | "even" | "custom"

export interface CourseFormValues {
  name: string
  teacher: string
  academicAdvisor: string
  classroom: string
  dayOfWeek: DayOfWeek
  startSection: SectionNumber
  endSection: SectionNumber
  weekMode: WeekSelectionMode
  startWeek: number
  endWeek: number
  customWeeks: string
  color: string
  note: string
}

export type CourseFormField =
  | "name"
  | "dayOfWeek"
  | "sections"
  | "weeks"
  | "teacher"
  | "academicAdvisor"
  | "classroom"
  | "note"

export type CourseFormErrors = Partial<Record<CourseFormField, string>>

export interface CourseDraft {
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

export interface CourseFormValidationResult {
  valid: boolean
  draft?: CourseDraft
  errors: CourseFormErrors
}

const DAY_VALUES: readonly DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7]
const MAX_NAME_LENGTH = 100
const MAX_SHORT_TEXT_LENGTH = 80
const MAX_NOTE_LENGTH = 500

function normalizeWeeks(weeks: readonly number[]): number[] {
  return [...new Set(weeks)]
    .filter((week) => Number.isSafeInteger(week) && week > 0)
    .sort((left, right) => left - right)
}

function isStepSequence(weeks: readonly number[], step: number): boolean {
  return weeks.length > 1 && weeks.slice(1).every((week, index) => week === weeks[index] + step)
}

function inferWeekSelection(weeks: readonly number[]): Pick<
  CourseFormValues,
  "weekMode" | "startWeek" | "endWeek" | "customWeeks"
> {
  const normalized = normalizeWeeks(weeks)
  const first = normalized[0] ?? 1
  const last = normalized.at(-1) ?? first

  if (normalized.length <= 1 || isStepSequence(normalized, 1)) {
    return { weekMode: "continuous", startWeek: first, endWeek: last, customWeeks: "" }
  }
  if (normalized.every((week) => week % 2 === 1) && isStepSequence(normalized, 2)) {
    return { weekMode: "odd", startWeek: first, endWeek: last, customWeeks: "" }
  }
  if (normalized.every((week) => week % 2 === 0) && isStepSequence(normalized, 2)) {
    return { weekMode: "even", startWeek: first, endWeek: last, customWeeks: "" }
  }

  return {
    weekMode: "custom",
    startWeek: first,
    endWeek: last,
    customWeeks: normalized.join(","),
  }
}

export function createCourseFormValues(
  course: Course | undefined,
  totalWeeks: number,
): CourseFormValues {
  const defaultEndWeek = Math.max(1, Math.min(totalWeeks, 16))
  if (!course) {
    return {
      name: "",
      teacher: "",
      academicAdvisor: "",
      classroom: "",
      dayOfWeek: 1,
      startSection: 1,
      endSection: 2,
      weekMode: "continuous",
      startWeek: 1,
      endWeek: defaultEndWeek,
      customWeeks: "",
      color: "",
      note: "",
    }
  }

  return {
    name: course.name,
    teacher: course.teacher ?? "",
    academicAdvisor: course.academicAdvisor ?? "",
    classroom: course.classroom ?? "",
    dayOfWeek: course.dayOfWeek,
    startSection: course.startSection,
    endSection: course.endSection,
    ...inferWeekSelection(course.weeks),
    color: course.color,
    note: course.note ?? "",
  }
}

export function buildWeekExpression(values: CourseFormValues): string {
  if (values.weekMode === "custom") return values.customWeeks

  const range = `${values.startWeek}-${values.endWeek}周`
  if (values.weekMode === "odd") return `${range}单周`
  if (values.weekMode === "even") return `${range}双周`
  return range
}

function optionalTrimmed(value: string): string | undefined {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

export function validateCourseForm(
  values: CourseFormValues,
  totalWeeks: number,
): CourseFormValidationResult {
  const errors: CourseFormErrors = {}
  const name = values.name.trim()
  if (name.length === 0) errors.name = "请输入课程名称"
  else if (name.length > MAX_NAME_LENGTH) errors.name = `课程名称不能超过 ${MAX_NAME_LENGTH} 个字符`

  if (!DAY_VALUES.includes(values.dayOfWeek)) errors.dayOfWeek = "请选择有效的星期"
  if (!isValidSectionRange(values.startSection, values.endSection)) {
    errors.sections = "结束节次不能早于开始节次，且节次必须在 1～11 之间"
  }

  const weekResult = parseWeekExpression(buildWeekExpression(values), { maxWeek: totalWeeks })
  if (weekResult.errors.length > 0 || weekResult.weeks.length === 0) {
    errors.weeks = weekResult.errors[0]?.message ?? "请至少选择一个上课周次"
  }

  const shortFields = [
    ["teacher", values.teacher, "教师"],
    ["academicAdvisor", values.academicAdvisor, "学术导师"],
    ["classroom", values.classroom, "教室"],
  ] as const
  for (const [field, value, label] of shortFields) {
    if (value.trim().length > MAX_SHORT_TEXT_LENGTH) {
      errors[field] = `${label}不能超过 ${MAX_SHORT_TEXT_LENGTH} 个字符`
    }
  }
  if (values.note.trim().length > MAX_NOTE_LENGTH) {
    errors.note = `备注不能超过 ${MAX_NOTE_LENGTH} 个字符`
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors }

  return {
    valid: true,
    draft: {
      name,
      teacher: optionalTrimmed(values.teacher),
      academicAdvisor: optionalTrimmed(values.academicAdvisor),
      classroom: optionalTrimmed(values.classroom),
      dayOfWeek: values.dayOfWeek,
      startSection: values.startSection,
      endSection: values.endSection,
      weeks: weekResult.weeks,
      color: values.color.trim(),
      note: optionalTrimmed(values.note),
    },
    errors: {},
  }
}

export function getCourseTimeLabel(
  course: Pick<Course, "startSection" | "endSection">,
  sectionTimes: readonly SectionTime[],
): string | undefined {
  const start = sectionTimes.find((item) => item.section === course.startSection)
  const end = sectionTimes.find((item) => item.section === course.endSection)
  return start && end ? `${start.startTime} - ${end.endTime}` : undefined
}

export function findCourseConflictMatches(
  candidate: Course,
  courses: readonly Course[],
  editingCourseId?: string,
): CourseConflictMatch[] {
  const comparableCourses = courses.filter(
    (course) => course.id !== editingCourseId && course.id !== candidate.id,
  )
  return getConflictsForCourse([candidate, ...comparableCourses], candidate.id)
}

export function formatConflictMessage(match: CourseConflictMatch): string {
  const sectionText =
    match.startSection === match.endSection
      ? `第${match.startSection}节`
      : `第${match.startSection}-${match.endSection}节`
  return `与“${match.course.name}”在${formatWeeks(match.overlappingWeeks)}、${sectionText}发生冲突`
}
