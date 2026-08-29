import { isValid, parseISO } from "date-fns"

import {
  DEFAULT_APPLICATION_SETTINGS,
  DEFAULT_SECTION_TIMES,
  DEFAULT_SEMESTER,
  MAX_SECTION_NUMBER,
} from "@/lib/defaults"
import { isValidSectionRange } from "@/lib/timetable"
import type {
  ApplicationSettings,
  Course,
  DayOfWeek,
  SectionNumber,
  SectionTime,
  Semester,
  ThemePreference,
  Todo,
  TodoType,
} from "@/types/timetable"

export const CURRENT_SCHEMA_VERSION = 2
export const APP_STORAGE_KEY = "university-timetable-pwa:state"

export interface PersistedAppState {
  schemaVersion: number
  courses: Course[]
  semester: Semester
  sectionTimes: SectionTime[]
  todos: Todo[]
  settings: ApplicationSettings
}

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type StorageWarningCode =
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "STORAGE_CLEAR_FAILED"
  | "INVALID_JSON"
  | "INVALID_ROOT"
  | "MISSING_SCHEMA_VERSION"
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "FUTURE_SCHEMA_VERSION"
  | "INVALID_STATE"

export interface StorageWarning {
  code: StorageWarningCode
  message: string
  path?: string
}

export interface LoadPersistedStateResult {
  state: PersistedAppState
  warnings: StorageWarning[]
  canPersist: boolean
  restored: boolean
}

export interface StorageOperationResult {
  success: boolean
  warnings: StorageWarning[]
}

export interface ImportPreview {
  valid: boolean
  state?: PersistedAppState
  warnings: string[]
  errors: string[]
}

interface StateValidationResult {
  state?: PersistedAppState
  errors: StorageWarning[]
}

interface MigrationResult extends StateValidationResult {
  warnings: StorageWarning[]
  canPersist: boolean
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

function warning(
  code: StorageWarningCode,
  message: string,
  path?: string,
): StorageWarning {
  return path === undefined ? { code, message } : { code, message, path }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string"
}

function isTodoType(value: unknown): value is TodoType {
  return value === "assignment" || value === "exam" || value === "course" || value === "other"
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && isValid(parseISO(value))
}

function isDayOfWeek(value: unknown): value is DayOfWeek {
  return Number.isInteger(value) && typeof value === "number" && value >= 1 && value <= 7
}

function isSectionNumber(value: unknown): value is SectionNumber {
  return (
    Number.isInteger(value) &&
    typeof value === "number" &&
    value >= 1 &&
    value <= MAX_SECTION_NUMBER
  )
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system"
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ISO_DATE_PATTERN.test(value) &&
    isValid(parseISO(value))
  )
}

function isTime(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value)
}

function validateCourse(value: unknown): value is Course {
  if (!isRecord(value)) return false

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isOptionalString(value.teacher) &&
    isOptionalString(value.academicAdvisor) &&
    isOptionalString(value.classroom) &&
    isOptionalString(value.note) &&
    isDayOfWeek(value.dayOfWeek) &&
    isSectionNumber(value.startSection) &&
    isSectionNumber(value.endSection) &&
    isValidSectionRange(value.startSection, value.endSection) &&
    Array.isArray(value.weeks) &&
    value.weeks.every((week) => Number.isSafeInteger(week) && week > 0) &&
    typeof value.color === "string"
  )
}

export function isValidSemester(value: unknown): value is Semester {
  if (!isRecord(value)) return false

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isIsoDate(value.startDate) &&
    isIsoDate(value.endDate) &&
    Number.isInteger(value.totalWeeks) &&
    typeof value.totalWeeks === "number" &&
    value.totalWeeks >= 1 &&
    value.startDate <= value.endDate
  )
}

export function isValidSectionTime(value: unknown): value is SectionTime {
  if (!isRecord(value)) return false

  return (
    isSectionNumber(value.section) &&
    isTime(value.startTime) &&
    isTime(value.endTime) &&
    value.startTime < value.endTime
  )
}

function validateSectionTimes(value: unknown): value is SectionTime[] {
  if (!Array.isArray(value) || value.length !== MAX_SECTION_NUMBER) return false
  if (!value.every(isValidSectionTime)) return false

  const sections = new Set(value.map((item) => item.section))
  return sections.size === MAX_SECTION_NUMBER
}

function validateTodo(value: unknown): value is Todo {
  if (!isRecord(value)) return false

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.title) &&
    isTodoType(value.type) &&
    typeof value.completed === "boolean" &&
    isOptionalString(value.courseId) &&
    isOptionalString(value.dueAt) &&
    isOptionalString(value.note) &&
    isIsoDateTime(value.createdAt)
  )
}

function validateSettings(value: unknown): value is ApplicationSettings {
  if (!isRecord(value)) return false

  return (
    isThemePreference(value.theme) &&
    (value.weekStartsOn === 1 || value.weekStartsOn === 7) &&
    typeof value.showWeekends === "boolean" &&
    typeof value.compactCourseCards === "boolean" &&
    (value.showDemoCourses === undefined || typeof value.showDemoCourses === "boolean") &&
    isOptionalString(value.defaultSemesterId)
  )
}

function validateCurrentState(value: unknown): StateValidationResult {
  if (!isRecord(value)) {
    return { errors: [warning("INVALID_ROOT", "持久化数据根节点必须是对象")] }
  }

  const courses = value.courses
  const semester = value.semester
  const sectionTimes = value.sectionTimes
  const todos = value.todos
  const settings = value.settings
  const coursesAreValid = Array.isArray(courses) && courses.every(validateCourse)
  const semesterIsValid = isValidSemester(semester)
  const sectionTimesAreValid = validateSectionTimes(sectionTimes)
  const todosAreValid = Array.isArray(todos) && todos.every(validateTodo)
  const settingsAreValid = validateSettings(settings)

  const errors: StorageWarning[] = []
  if (!coursesAreValid) {
    errors.push(warning("INVALID_STATE", "courses 字段格式无效", "courses"))
  }
  if (!semesterIsValid) {
    errors.push(warning("INVALID_STATE", "semester 字段格式无效", "semester"))
  }
  if (!sectionTimesAreValid) {
    errors.push(warning("INVALID_STATE", "sectionTimes 必须包含唯一且有效的第 1～11 节", "sectionTimes"))
  }
  if (!todosAreValid) {
    errors.push(warning("INVALID_STATE", "todos 字段格式无效", "todos"))
  }
  if (!settingsAreValid) {
    errors.push(warning("INVALID_STATE", "settings 字段格式无效", "settings"))
  }

  if (
    errors.length > 0 ||
    !coursesAreValid ||
    !semesterIsValid ||
    !sectionTimesAreValid ||
    !todosAreValid ||
    !settingsAreValid
  ) {
    return { errors }
  }

  return {
    state: clonePersistedState({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      courses,
      semester,
      sectionTimes,
      todos,
      settings,
    }),
    errors: [],
  }
}

function getBrowserStorage(): StorageAdapter | undefined {
  try {
    return typeof globalThis.localStorage === "undefined"
      ? undefined
      : globalThis.localStorage
  } catch {
    return undefined
  }
}

export function clonePersistedState(state: PersistedAppState): PersistedAppState {
  return {
    schemaVersion: state.schemaVersion,
    courses: state.courses.map((course) => ({ ...course, weeks: [...course.weeks] })),
    semester: { ...state.semester },
    sectionTimes: state.sectionTimes.map((sectionTime) => ({ ...sectionTime })),
    todos: state.todos.map((todo) => ({ ...todo })),
    settings: { ...state.settings },
  }
}

export function createDefaultPersistedState(): PersistedAppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    courses: [],
    semester: { ...DEFAULT_SEMESTER },
    sectionTimes: DEFAULT_SECTION_TIMES.map((sectionTime) => ({ ...sectionTime })),
    todos: [],
    settings: { ...DEFAULT_APPLICATION_SETTINGS },
  }
}

/**
 * Version gate and migration entry point. Legacy v1 todos did not carry their
 * category or creation timestamp; migration supplies safe defaults without
 * touching the original stored payload until a later successful write.
 */
export function migratePersistedState(raw: unknown): MigrationResult {
  if (!isRecord(raw)) {
    return {
      errors: [warning("INVALID_ROOT", "持久化数据根节点必须是对象")],
      warnings: [],
      canPersist: true,
    }
  }

  if (typeof raw.schemaVersion !== "number" || !Number.isInteger(raw.schemaVersion)) {
    return {
      errors: [warning("MISSING_SCHEMA_VERSION", "缺少有效的 schemaVersion")],
      warnings: [],
      canPersist: true,
    }
  }

  const schemaVersion = raw.schemaVersion
  if (schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      errors: [
        warning(
          "FUTURE_SCHEMA_VERSION",
          `数据版本 ${schemaVersion} 高于当前支持版本 ${CURRENT_SCHEMA_VERSION}`,
        ),
      ],
      warnings: [],
      canPersist: false,
    }
  }

  if (schemaVersion === 1) {
    const migratedTodos = Array.isArray(raw.todos)
      ? raw.todos.map((todo) =>
          isRecord(todo)
            ? {
                ...todo,
                type: isTodoType(todo.type) ? todo.type : "other",
                createdAt: isIsoDateTime(todo.createdAt)
                  ? todo.createdAt
                  : "1970-01-01T00:00:00.000Z",
              }
            : todo,
        )
      : raw.todos
    const validated = validateCurrentState({
      ...raw,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      todos: migratedTodos,
    })
    return {
      ...validated,
      warnings: [warning("UNSUPPORTED_SCHEMA_VERSION", "已将待办数据迁移至当前版本")],
      canPersist: validated.state !== undefined,
    }
  }

  if (schemaVersion < CURRENT_SCHEMA_VERSION) {
    return {
      errors: [
        warning(
          "UNSUPPORTED_SCHEMA_VERSION",
          `尚未提供从数据版本 ${schemaVersion} 到 ${CURRENT_SCHEMA_VERSION} 的迁移`,
        ),
      ],
      warnings: [],
      canPersist: false,
    }
  }

  const validated = validateCurrentState(raw)
  return { ...validated, warnings: [], canPersist: true }
}

export function parsePersistedState(serialized: string): MigrationResult {
  let raw: unknown
  try {
    raw = JSON.parse(serialized) as unknown
  } catch {
    return {
      errors: [warning("INVALID_JSON", "本地数据不是有效 JSON")],
      warnings: [],
      canPersist: true,
    }
  }

  return migratePersistedState(raw)
}

export function loadPersistedState(
  storage: StorageAdapter | undefined = getBrowserStorage(),
): LoadPersistedStateResult {
  const defaultState = createDefaultPersistedState()
  if (!storage) {
    return {
      state: defaultState,
      warnings: [warning("STORAGE_UNAVAILABLE", "当前环境不支持本地存储")],
      canPersist: false,
      restored: false,
    }
  }

  let serialized: string | null
  try {
    serialized = storage.getItem(APP_STORAGE_KEY)
  } catch {
    return {
      state: defaultState,
      warnings: [warning("STORAGE_READ_FAILED", "读取本地数据失败")],
      canPersist: false,
      restored: false,
    }
  }

  if (serialized === null) {
    return {
      state: defaultState,
      warnings: [],
      canPersist: true,
      restored: false,
    }
  }

  const parsed = parsePersistedState(serialized)
  if (!parsed.state) {
    return {
      state: defaultState,
      warnings: [...parsed.warnings, ...parsed.errors],
      canPersist: parsed.canPersist,
      restored: false,
    }
  }

  return {
    state: parsed.state,
    warnings: parsed.warnings,
    canPersist: parsed.canPersist,
    restored: true,
  }
}

export function savePersistedState(
  state: PersistedAppState,
  storage: StorageAdapter | undefined = getBrowserStorage(),
): StorageOperationResult {
  if (!storage) {
    return {
      success: false,
      warnings: [warning("STORAGE_UNAVAILABLE", "当前环境不支持本地存储")],
    }
  }

  try {
    storage.setItem(APP_STORAGE_KEY, exportAppData(state))
    return { success: true, warnings: [] }
  } catch {
    return {
      success: false,
      warnings: [warning("STORAGE_WRITE_FAILED", "保存本地数据失败")],
    }
  }
}

export function clearPersistedState(
  storage: StorageAdapter | undefined = getBrowserStorage(),
): StorageOperationResult {
  if (!storage) {
    return {
      success: false,
      warnings: [warning("STORAGE_UNAVAILABLE", "当前环境不支持本地存储")],
    }
  }

  try {
    storage.removeItem(APP_STORAGE_KEY)
    return { success: true, warnings: [] }
  } catch {
    return {
      success: false,
      warnings: [warning("STORAGE_CLEAR_FAILED", "清除本地数据失败")],
    }
  }
}

export function exportAppData(state: PersistedAppState): string {
  return JSON.stringify(clonePersistedState(state), null, 2)
}

export function previewImportedAppData(serialized: string): ImportPreview {
  const parsed = parsePersistedState(serialized)
  return {
    valid: parsed.state !== undefined,
    ...(parsed.state ? { state: parsed.state } : {}),
    warnings: parsed.warnings.map((item) => item.message),
    errors: parsed.errors.map((item) => item.message),
  }
}
