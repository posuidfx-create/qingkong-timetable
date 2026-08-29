import * as XLSX from "xlsx"

import { parseWeekExpression } from "@/lib/weekParser"
import type {
  ImportMetadata,
  ImportResult,
  ImportWarning,
  ImportedCourseSource,
  TimetableOption,
  WorkbookImportResult,
} from "@/types/importTimetable"
import type { Course, DayOfWeek, SectionNumber } from "@/types/timetable"

const DAY_OF_WEEK: Record<string, DayOfWeek> = {
  星期一: 1,
  周一: 1,
  星期二: 2,
  周二: 2,
  星期三: 3,
  周三: 3,
  星期四: 4,
  周四: 4,
  星期五: 5,
  周五: 5,
  星期六: 6,
  周六: 6,
  星期日: 7,
  周日: 7,
}

const COURSE_HEADER_PATTERN = /^(?<name>.+?)[（(](?<week>[^（）()\n]*?(?:\d[^（）()\n]*周|单周|双周)[^（）()\n]*)[）)]\s*(?<suffix>.*)$/
const CLASSROOM_PATTERN = /(?<![A-Z\d])[A-Z]\d{1,2}-\d{3,4}(?!\d)/
const SECTION_PATTERN = /^第\s*(\d{1,2})\s*节$/
const TEACHER_LABEL_PATTERN = /授课教师\s*[：:]\s*([^\s]+?)(?=\s+学术导师\s*[：:]|$)/
const ADVISOR_LABEL_PATTERN = /学术导师\s*[：:]\s*([^\s]+?)(?=\s+授课教师\s*[：:]|$)/
const NAME_PATTERN = /^[\p{Script=Han}·•]{2,12}$/u

export interface ParseWorkbookOptions {
  sourceFileName?: string
  totalWeeks?: number
}

export interface ParsedCourseCell {
  name: string
  rawWeekText: string
  teacher?: string
  academicAdvisor?: string
  classroom?: string
  rawText: string
}

interface MergedRange {
  startRow: number
  endRow: number
  startColumn: number
  endColumn: number
  encoded: string
}

function createWarning(
  code: ImportWarning["code"],
  message: string,
  severity: ImportWarning["severity"],
  cell?: string,
  rawText?: string,
): ImportWarning {
  return {
    code,
    message,
    severity,
    ...(cell ? { cell } : {}),
    ...(rawText ? { rawText } : {}),
  }
}

function cellText(worksheet: XLSX.WorkSheet, row: number, column: number): string {
  const address = XLSX.utils.encode_cell({ r: row, c: column })
  return normalizeCellText(worksheet[address]?.v)
}

function normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function toSectionNumber(value: number): SectionNumber | undefined {
  const sections: readonly SectionNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  return sections.find((section) => section === value)
}

/** Normalizes line endings, full-width spacing and incidental blank lines without losing blocks. */
export function normalizeCellText(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value)
    .replace(/\r\n?/g, "\n")
    .replace(/\u3000/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
}

export function extractClassroom(value: string): string | undefined {
  return CLASSROOM_PATTERN.exec(value)?.[0]
}

export function extractAcademicAdvisor(value: string): string | undefined {
  return ADVISOR_LABEL_PATTERN.exec(value)?.[1]?.trim()
}

export function extractTeacher(value: string): string | undefined {
  const labelledTeacher = TEACHER_LABEL_PATTERN.exec(value)?.[1]?.trim()
  if (labelledTeacher) return labelledTeacher

  for (const line of normalizeCellText(value).split("\n")) {
    if (line.includes("教师") || line.includes("导师")) continue
    const candidate = line.replace(CLASSROOM_PATTERN, "").trim()
    if (NAME_PATTERN.test(candidate)) return candidate
  }
  return undefined
}

function parseHeader(line: string): { name: string; rawWeekText: string; suffix: string } | undefined {
  const match = COURSE_HEADER_PATTERN.exec(line.trim())
  if (!match?.groups) return undefined
  const name = normalizeName(match.groups.name)
  const rawWeekText = match.groups.week.trim()
  return name.length > 0 && rawWeekText.length > 0
    ? { name, rawWeekText, suffix: match.groups.suffix.trim() }
    : undefined
}

/** Splits a physical Excel cell into one or more logical course blocks. */
export function parseCourseCell(rawValue: unknown): ParsedCourseCell[] {
  const rawText = normalizeCellText(rawValue)
  if (!rawText) return []

  const blocks: { header: ReturnType<typeof parseHeader>; lines: string[] }[] = []
  for (const line of rawText.split("\n")) {
    const header = parseHeader(line)
    if (header) {
      blocks.push({ header, lines: [line] })
    } else if (blocks.length > 0) {
      blocks.at(-1)?.lines.push(line)
    }
  }

  return blocks.flatMap((block) => {
    if (!block.header) return []
    const blockText = block.lines.join("\n")
    return [{
      name: block.header.name,
      rawWeekText: block.header.rawWeekText,
      teacher: extractTeacher(blockText),
      academicAdvisor: extractAcademicAdvisor(blockText),
      classroom: extractClassroom(`${block.header.suffix}\n${blockText}`),
      rawText: blockText,
    }]
  })
}

function getMergedRanges(worksheet: XLSX.WorkSheet): MergedRange[] {
  return (worksheet["!merges"] ?? []).map((range) => ({
    startRow: range.s.r,
    endRow: range.e.r,
    startColumn: range.s.c,
    endColumn: range.e.c,
    encoded: XLSX.utils.encode_range(range),
  }))
}

export function resolveMergedRange(
  worksheet: XLSX.WorkSheet,
  row: number,
  column: number,
): string | undefined {
  return getMergedRanges(worksheet).find(
    (range) =>
      row >= range.startRow &&
      row <= range.endRow &&
      column >= range.startColumn &&
      column <= range.endColumn,
  )?.encoded
}

function getMergedRangeAtStart(
  ranges: readonly MergedRange[],
  row: number,
  column: number,
): MergedRange | undefined {
  return ranges.find((range) => range.startRow === row && range.startColumn === column)
}

function isCoveredByMergedRange(
  ranges: readonly MergedRange[],
  row: number,
  column: number,
): boolean {
  return ranges.some(
    (range) =>
      row >= range.startRow &&
      row <= range.endRow &&
      column >= range.startColumn &&
      column <= range.endColumn &&
      (range.startRow !== row || range.startColumn !== column),
  )
}

function getWorksheetBounds(worksheet: XLSX.WorkSheet): XLSX.Range | undefined {
  return worksheet["!ref"] ? XLSX.utils.decode_range(worksheet["!ref"]) : undefined
}

function detectDayByRow(worksheet: XLSX.WorkSheet, bounds: XLSX.Range): Map<number, DayOfWeek> {
  const mapped = new Map<number, DayOfWeek>()
  const ranges = getMergedRanges(worksheet)
  for (let row = bounds.s.r; row <= bounds.e.r; row += 1) {
    for (let column = bounds.s.c; column <= bounds.e.c; column += 1) {
      const day = DAY_OF_WEEK[cellText(worksheet, row, column)]
      if (!day) continue
      const merged = getMergedRangeAtStart(ranges, row, column)
      const endRow = merged?.endRow ?? row
      for (let targetRow = row; targetRow <= endRow; targetRow += 1) mapped.set(targetRow, day)
    }
  }
  return mapped
}

function detectSectionByRow(
  worksheet: XLSX.WorkSheet,
  bounds: XLSX.Range,
): Map<number, SectionNumber> {
  const mapped = new Map<number, SectionNumber>()
  for (let row = bounds.s.r; row <= bounds.e.r; row += 1) {
    for (let column = bounds.s.c; column <= bounds.e.c; column += 1) {
      const match = SECTION_PATTERN.exec(cellText(worksheet, row, column))
      const section = match ? toSectionNumber(Number(match[1])) : undefined
      if (section !== undefined) {
        mapped.set(row, section)
      }
    }
  }
  return mapped
}

/** Finds timetable columns by their grade/major header above a weekday-and-section body. */
export function detectTimetableRegions(
  worksheet: XLSX.WorkSheet,
  sheetName: string,
): TimetableOption[] {
  const bounds = getWorksheetBounds(worksheet)
  if (!bounds) return []
  const firstDayRow = [...detectDayByRow(worksheet, bounds).keys()].sort((a, b) => a - b)[0]
  if (firstDayRow === undefined) return []

  const options: TimetableOption[] = []
  for (let column = bounds.s.c; column <= bounds.e.c; column += 1) {
    for (let row = bounds.s.r; row < firstDayRow; row += 1) {
      const label = cellText(worksheet, row, column)
      if (!label || label === "课程安排" || DAY_OF_WEEK[label] || SECTION_PATTERN.test(label)) continue
      const hasCourseBody = Array.from({ length: bounds.e.r - firstDayRow + 1 }, (_, index) =>
        cellText(worksheet, firstDayRow + index, column),
      ).some(Boolean)
      if (!hasCourseBody) continue
      const columnLetter = XLSX.utils.encode_col(column)
      options.push({
        id: `${sheetName}:${columnLetter}`,
        label,
        className: cellText(worksheet, row + 1, column) || undefined,
        sheetName,
        column: columnLetter,
      })
      break
    }
  }
  return options
}

function createDeterministicCourseId(
  timetableId: string,
  course: Omit<Course, "id">,
): string {
  const source = [
    timetableId,
    course.dayOfWeek,
    course.startSection,
    course.endSection,
    course.name,
    course.weeks.join(","),
    course.teacher ?? "",
    course.academicAdvisor ?? "",
    course.classroom ?? "",
  ].join("|")
  let hash = 2166136261
  for (const character of source) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return `xlsx-${(hash >>> 0).toString(36)}`
}

function createEmptyResult(option: TimetableOption, options: ParseWorkbookOptions, mergedRangeCount: number): ImportResult {
  const metadata: ImportMetadata = {
    sheetName: option.sheetName,
    ...(options.sourceFileName ? { sourceFileName: options.sourceFileName } : {}),
    timetable: option,
    physicalCourseCells: 0,
    parsedCourseItems: 0,
    uniqueCourseNames: 0,
    mergedRangeCount,
    courseSources: {},
  }
  return { courses: [], warnings: [], metadata }
}

export function parseWorksheet(
  worksheet: XLSX.WorkSheet,
  option: TimetableOption,
  options: ParseWorkbookOptions = {},
): ImportResult {
  const bounds = getWorksheetBounds(worksheet)
  const mergedRanges = getMergedRanges(worksheet)
  const result = createEmptyResult(option, options, mergedRanges.length)
  if (!bounds) {
    result.warnings.push(createWarning("NO_TIMETABLE_STRUCTURE", "工作表没有可读取的数据区域。", "error"))
    return result
  }

  const dayByRow = detectDayByRow(worksheet, bounds)
  const sectionByRow = detectSectionByRow(worksheet, bounds)
  if (dayByRow.size === 0) {
    result.warnings.push(createWarning("NO_WEEKDAY_MAPPING", "未识别到星期分块，无法解析课表。", "error"))
    return result
  }
  if (sectionByRow.size === 0) {
    result.warnings.push(createWarning("NO_SECTION_MAPPING", "未识别到节次行，无法解析课表。", "error"))
    return result
  }

  const column = XLSX.utils.decode_col(option.column)
  const seenCourseIds = new Set<string>()
  for (let row = bounds.s.r; row <= bounds.e.r; row += 1) {
    const dayOfWeek = dayByRow.get(row)
    const startSection = sectionByRow.get(row)
    if (!dayOfWeek || !startSection || isCoveredByMergedRange(mergedRanges, row, column)) continue

    const text = cellText(worksheet, row, column)
    if (!text) continue
    const cell = XLSX.utils.encode_cell({ r: row, c: column })
    const merged = getMergedRangeAtStart(mergedRanges, row, column)
    const endSection = merged ? sectionByRow.get(merged.endRow) : startSection
    if (!endSection) {
      result.warnings.push(
        createWarning("MERGED_RANGE_ERROR", "合并单元格末行无法映射到节次，已跳过该课程块。", "error", cell, text),
      )
      continue
    }

    result.metadata.physicalCourseCells += 1
    const parsedCells = parseCourseCell(text)
    if (parsedCells.length === 0) {
      result.warnings.push(
        createWarning("COURSE_PARSE_FAILED", "疑似课程单元格无法识别课程名称和周次，已跳过。", "warning", cell, text),
      )
      continue
    }

    for (const parsed of parsedCells) {
      const weeks = parseWeekExpression(parsed.rawWeekText, { maxWeek: options.totalWeeks ?? 20 })
      if (weeks.errors.length > 0 || weeks.weeks.length === 0) {
        result.warnings.push(
          createWarning("UNRECOGNIZED_WEEK", `“${parsed.name}”的周次无法识别：${weeks.errors[0]?.message ?? "未知错误"}`, "warning", cell, parsed.rawText),
        )
        continue
      }

      if (!parsed.teacher) {
        result.warnings.push(createWarning("UNRECOGNIZED_TEACHER", `“${parsed.name}”未识别到授课教师，课程仍会导入。`, "warning", cell, parsed.rawText))
      }
      if (!parsed.classroom) {
        result.warnings.push(createWarning("UNRECOGNIZED_CLASSROOM", `“${parsed.name}”未识别到教室，课程仍会导入。`, "warning", cell, parsed.rawText))
      }

      const draft: Omit<Course, "id"> = {
        name: parsed.name,
        ...(parsed.teacher ? { teacher: parsed.teacher } : {}),
        ...(parsed.academicAdvisor ? { academicAdvisor: parsed.academicAdvisor } : {}),
        ...(parsed.classroom ? { classroom: parsed.classroom } : {}),
        dayOfWeek,
        startSection,
        endSection,
        weeks: weeks.weeks,
        color: "",
      }
      const course: Course = { ...draft, id: createDeterministicCourseId(option.id, draft) }
      if (seenCourseIds.has(course.id)) {
        result.warnings.push(createWarning("SUSPECTED_DUPLICATE", `“${course.name}”疑似重复课程，已跳过。`, "warning", cell, parsed.rawText))
        continue
      }
      seenCourseIds.add(course.id)
      result.courses.push(course)
      const source: ImportedCourseSource = {
        cell,
        ...(merged ? { mergedRange: merged.encoded } : {}),
        rawText: parsed.rawText,
        timetableId: option.id,
      }
      result.metadata.courseSources[course.id] = source
    }
  }

  result.metadata.parsedCourseItems = result.courses.length
  result.metadata.uniqueCourseNames = new Set(result.courses.map((course) => course.name)).size
  return result
}

/** Parses all detected timetable columns in a local workbook without uploading it anywhere. */
export function parseWorkbook(
  data: ArrayBuffer | Uint8Array,
  options: ParseWorkbookOptions = {},
): WorkbookImportResult {
  const empty: WorkbookImportResult = {
    availableTimetables: [],
    results: {},
    warnings: [],
    metadata: {
      ...(options.sourceFileName ? { sourceFileName: options.sourceFileName } : {}),
      sheetNames: [],
      mergedRangeCount: 0,
      physicalCourseCells: 0,
      parsedCourseItems: 0,
    },
  }

  if (options.sourceFileName && !/\.(xlsx|xls)$/i.test(options.sourceFileName)) {
    empty.warnings.push(createWarning("INVALID_FILE_TYPE", "请选择 .xlsx 或 .xls 格式的课程表文件。", "error"))
    return empty
  }

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(data, { type: "array" })
  } catch {
    empty.warnings.push(createWarning("WORKBOOK_READ_FAILED", "无法读取该 Excel 文件，文件可能已损坏或格式不受支持。", "error"))
    return empty
  }

  empty.metadata.sheetNames = workbook.SheetNames
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) continue
    const regions = detectTimetableRegions(worksheet, sheetName)
    const mergedRangeCount = getMergedRanges(worksheet).length
    empty.metadata.mergedRangeCount += mergedRangeCount
    for (const region of regions) {
      const result = parseWorksheet(worksheet, region, options)
      empty.availableTimetables.push(region)
      empty.results[region.id] = result
      empty.metadata.physicalCourseCells += result.metadata.physicalCourseCells
      empty.metadata.parsedCourseItems += result.metadata.parsedCourseItems
    }
  }

  if (empty.availableTimetables.length === 0) {
    empty.warnings.push(createWarning("NO_TIMETABLE_STRUCTURE", "未找到包含星期、节次和课程列的课表结构。", "error"))
  }
  return empty
}
