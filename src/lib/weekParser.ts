export interface ParseWeekExpressionOptions {
  maxWeek?: number
}

export type WeekParseErrorCode =
  | "EMPTY_EXPRESSION"
  | "INVALID_MAX_WEEK"
  | "MISSING_MAX_WEEK"
  | "UNKNOWN_FORMAT"
  | "INVALID_WEEK"
  | "REVERSED_RANGE"
  | "WEEK_EXCEEDS_MAX"
  | "CONFLICTING_PARITY"

export interface WeekParseError {
  code: WeekParseErrorCode
  message: string
  fragment?: string
}

export interface WeekParseResult {
  weeks: number[]
  normalized: string
  errors: WeekParseError[]
}

const RANGE_SEPARATOR_PATTERN = /[‐-―−－]/g
const LIST_SEPARATOR_PATTERN = /[，、；;]/g

function normalizeExpression(expression: string): string {
  let normalized = expression
    .normalize("NFKC")
    .replace(RANGE_SEPARATOR_PATTERN, "-")
    .replace(LIST_SEPARATOR_PATTERN, ",")
    .replace(/\s+/g, "")

  while (
    normalized.length >= 2 &&
    normalized.startsWith("(") &&
    normalized.endsWith(")")
  ) {
    normalized = normalized.slice(1, -1)
  }

  return normalized
}

function createError(
  code: WeekParseErrorCode,
  message: string,
  fragment?: string,
): WeekParseError {
  return fragment === undefined ? { code, message } : { code, message, fragment }
}

function expandRange(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

/**
 * Parses a week expression without throwing. Invalid input returns no weeks and
 * one or more structured errors so import and form callers can decide how to
 * surface the problem.
 */
export function parseWeekExpression(
  expression: string,
  options: ParseWeekExpressionOptions = {},
): WeekParseResult {
  const normalized = normalizeExpression(expression)

  if (normalized.length === 0) {
    return {
      weeks: [],
      normalized,
      errors: [createError("EMPTY_EXPRESSION", "周次表达不能为空")],
    }
  }

  const { maxWeek } = options
  if (maxWeek !== undefined && (!Number.isInteger(maxWeek) || maxWeek < 1)) {
    return {
      weeks: [],
      normalized,
      errors: [createError("INVALID_MAX_WEEK", "学期总周数必须是正整数")],
    }
  }

  const hasOddParity = normalized.includes("单周")
  const hasEvenParity = normalized.includes("双周")
  if (hasOddParity && hasEvenParity) {
    return {
      weeks: [],
      normalized,
      errors: [createError("CONFLICTING_PARITY", "同一表达式不能同时指定单周和双周")],
    }
  }

  let body = normalized.replaceAll("单周", "").replaceAll("双周", "")
  body = body.replaceAll("周", "")

  let candidates: number[] = []
  const errors: WeekParseError[] = []

  if (body.length === 0) {
    if (!hasOddParity && !hasEvenParity) {
      errors.push(createError("UNKNOWN_FORMAT", "未找到可识别的教学周"))
    } else if (maxWeek === undefined) {
      errors.push(
        createError("MISSING_MAX_WEEK", "单独使用单周或双周时必须提供学期总周数"),
      )
    } else {
      candidates = expandRange(1, maxWeek)
    }
  } else {
    const fragments = body.split(",")
    if (fragments.some((fragment) => fragment.length === 0)) {
      errors.push(createError("UNKNOWN_FORMAT", "周次列表中存在空片段"))
    }

    for (const fragment of fragments) {
      if (fragment.length === 0) continue

      const singleWeekMatch = /^(\d+)$/.exec(fragment)
      if (singleWeekMatch) {
        candidates.push(Number(singleWeekMatch[1]))
        continue
      }

      const rangeMatch = /^(\d+)-(\d+)$/.exec(fragment)
      if (rangeMatch) {
        const start = Number(rangeMatch[1])
        const end = Number(rangeMatch[2])
        if (start > end) {
          errors.push(createError("REVERSED_RANGE", "周次范围起点不能大于终点", fragment))
        } else {
          candidates.push(...expandRange(start, end))
        }
        continue
      }

      errors.push(createError("UNKNOWN_FORMAT", "无法识别周次片段", fragment))
    }
  }

  if (candidates.some((week) => !Number.isSafeInteger(week) || week < 1)) {
    errors.push(createError("INVALID_WEEK", "教学周必须是安全的正整数"))
  }

  if (maxWeek !== undefined && candidates.some((week) => week > maxWeek)) {
    errors.push(
      createError("WEEK_EXCEEDS_MAX", `教学周不能超过学期总周数 ${maxWeek}`),
    )
  }

  if (errors.length > 0) {
    return { weeks: [], normalized, errors }
  }

  const weeks = [...new Set(candidates)]
    .filter((week) =>
      hasOddParity ? week % 2 === 1 : hasEvenParity ? week % 2 === 0 : true,
    )
    .sort((left, right) => left - right)

  return { weeks, normalized, errors: [] }
}

export function formatWeeks(weeks: readonly number[]): string {
  const normalizedWeeks = [...new Set(weeks)]
    .filter((week) => Number.isSafeInteger(week) && week > 0)
    .sort((left, right) => left - right)

  if (normalizedWeeks.length === 0) return ""

  const ranges: string[] = []
  let rangeStart = normalizedWeeks[0]
  let previous = normalizedWeeks[0]

  for (const week of normalizedWeeks.slice(1)) {
    if (week === previous + 1) {
      previous = week
      continue
    }

    ranges.push(rangeStart === previous ? `${rangeStart}` : `${rangeStart}-${previous}`)
    rangeStart = week
    previous = week
  }

  ranges.push(rangeStart === previous ? `${rangeStart}` : `${rangeStart}-${previous}`)
  return `${ranges.join(",")}周`
}
