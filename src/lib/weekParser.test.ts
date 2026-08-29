import { describe, expect, it } from "vitest"

import { formatWeeks, parseWeekExpression } from "@/lib/weekParser"

describe("parseWeekExpression", () => {
  const realExcelExpressions = [
    ["1-8周", [1, 2, 3, 4, 5, 6, 7, 8]],
    ["1-16周", Array.from({ length: 16 }, (_, index) => index + 1)],
    ["1-12周", Array.from({ length: 12 }, (_, index) => index + 1)],
    ["2-5周", [2, 3, 4, 5]],
    ["2-4周", [2, 3, 4]],
    ["10-12周", [10, 11, 12]],
    ["13-16周", [13, 14, 15, 16]],
    ["13-15周", [13, 14, 15]],
    ["9-12周", [9, 10, 11, 12]],
    ["9-11周", [9, 10, 11]],
    ["7-14周", [7, 8, 9, 10, 11, 12, 13, 14]],
  ] as const

  it.each(realExcelExpressions)("解析真实 Excel 周次 %s", (expression, expected) => {
    expect(parseWeekExpression(expression, { maxWeek: 16 })).toMatchObject({
      weeks: expected,
      errors: [],
    })
  })

  it.each([
    ["（1-16周）", Array.from({ length: 16 }, (_, index) => index + 1)],
    ["(1-16周)", Array.from({ length: 16 }, (_, index) => index + 1)],
    ["(1-12周）", Array.from({ length: 12 }, (_, index) => index + 1)],
    ["1，3，5，7周", [1, 3, 5, 7]],
    ["1,3,5,7周", [1, 3, 5, 7]],
    ["1、3、5、7周", [1, 3, 5, 7]],
    [" 1 - 4 周\n", [1, 2, 3, 4]],
    ["1–4周", [1, 2, 3, 4]],
    ["1—4周", [1, 2, 3, 4]],
    ["1－4周", [1, 2, 3, 4]],
    ["1-4,7-10周", [1, 2, 3, 4, 7, 8, 9, 10]],
    ["1,1,2,2,3周", [1, 2, 3]],
  ] as const)("兼容格式差异 %s", (expression, expected) => {
    expect(parseWeekExpression(expression, { maxWeek: 16 }).weeks).toEqual(expected)
  })

  it("解析范围内的单周", () => {
    expect(parseWeekExpression("1-16周单周").weeks).toEqual([1, 3, 5, 7, 9, 11, 13, 15])
  })

  it("解析范围内的双周", () => {
    expect(parseWeekExpression("1-16周双周").weeks).toEqual([2, 4, 6, 8, 10, 12, 14, 16])
  })

  it("根据学期总周数展开单独的单周和双周", () => {
    expect(parseWeekExpression("单周", { maxWeek: 8 }).weeks).toEqual([1, 3, 5, 7])
    expect(parseWeekExpression("双周", { maxWeek: 8 }).weeks).toEqual([2, 4, 6, 8])
  })

  it.each([
    ["", "EMPTY_EXPRESSION"],
    ["   \n", "EMPTY_EXPRESSION"],
    ["下半学期", "UNKNOWN_FORMAT"],
    ["0周", "INVALID_WEEK"],
    ["-1周", "UNKNOWN_FORMAT"],
    ["16-1周", "REVERSED_RANGE"],
    ["1-20周", "WEEK_EXCEEDS_MAX"],
    ["单周双周", "CONFLICTING_PARITY"],
    ["单周", "MISSING_MAX_WEEK"],
    ["1-4,未知周", "UNKNOWN_FORMAT"],
  ])("防御异常输入 %s", (expression, errorCode) => {
    const result = parseWeekExpression(expression, { maxWeek: expression === "单周" ? undefined : 16 })
    expect(result.weeks).toEqual([])
    expect(result.errors.some((error) => error.code === errorCode)).toBe(true)
  })

  it("拒绝无效的学期总周数", () => {
    expect(parseWeekExpression("1-4周", { maxWeek: 0 })).toMatchObject({
      weeks: [],
      errors: [{ code: "INVALID_MAX_WEEK" }],
    })
  })
})

describe("formatWeeks", () => {
  it("格式化连续周次", () => {
    expect(formatWeeks([1, 2, 3, 4, 5])).toBe("1-5周")
  })

  it("格式化非连续周次并去重排序", () => {
    expect(formatWeeks([7, 1, 3, 5, 3])).toBe("1,3,5,7周")
  })

  it("保留清晰的混合区间", () => {
    expect(formatWeeks([1, 2, 3, 5, 7, 8, 9])).toBe("1-3,5,7-9周")
  })

  it("空列表返回空文本", () => {
    expect(formatWeeks([])).toBe("")
  })
})
