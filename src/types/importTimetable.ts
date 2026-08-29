import type { Course } from "@/types/timetable"

export type ImportWarningCode =
  | "INVALID_FILE_TYPE"
  | "WORKBOOK_READ_FAILED"
  | "NO_TIMETABLE_STRUCTURE"
  | "NO_WEEKDAY_MAPPING"
  | "NO_SECTION_MAPPING"
  | "UNRECOGNIZED_WEEK"
  | "UNRECOGNIZED_TEACHER"
  | "UNRECOGNIZED_CLASSROOM"
  | "UNKNOWN_FORMAT"
  | "COURSE_PARSE_FAILED"
  | "MERGED_RANGE_ERROR"
  | "SUSPECTED_DUPLICATE"

export interface ImportWarning {
  code: ImportWarningCode
  message: string
  severity: "info" | "warning" | "error"
  cell?: string
  rawText?: string
}

export interface TimetableOption {
  id: string
  label: string
  className?: string
  sheetName: string
  column: string
}

export interface ImportedCourseSource {
  cell: string
  mergedRange?: string
  rawText: string
  timetableId: string
}

export interface ImportMetadata {
  sheetName: string
  sourceFileName?: string
  timetable: TimetableOption
  physicalCourseCells: number
  parsedCourseItems: number
  uniqueCourseNames: number
  mergedRangeCount: number
  courseSources: Record<string, ImportedCourseSource>
}

export interface ImportResult {
  courses: Course[]
  warnings: ImportWarning[]
  metadata: ImportMetadata
}

export interface WorkbookImportMetadata {
  sourceFileName?: string
  sheetNames: string[]
  mergedRangeCount: number
  physicalCourseCells: number
  parsedCourseItems: number
}

export interface WorkbookImportResult {
  availableTimetables: TimetableOption[]
  results: Record<string, ImportResult>
  warnings: ImportWarning[]
  metadata: WorkbookImportMetadata
}

