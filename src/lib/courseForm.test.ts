import { describe, expect, it } from "vitest"

import {
  buildWeekExpression,
  createCourseFormValues,
  findCourseConflictMatches,
  getCourseTimeLabel,
  validateCourseForm,
  type CourseFormValues,
} from "@/lib/courseForm"
import { DEFAULT_SECTION_TIMES } from "@/lib/defaults"
import { createUniqueId } from "@/lib/id"
import type { Course } from "@/types/timetable"

function formValues(updates: Partial<CourseFormValues> = {}): CourseFormValues {
  return {
    ...createCourseFormValues(undefined, 20),
    name: "综合日语（三）",
    ...updates,
  }
}

function course(updates: Partial<Course> = {}): Course {
  return {
    id: "course-1",
    name: "环境设计",
    teacher: "冈田庸平",
    academicAdvisor: "王词光",
    classroom: "A7-322",
    dayOfWeek: 1,
    startSection: 5,
    endSection: 8,
    weeks: [2, 3, 4, 5],
    color: "#789A88",
    note: "真实课表样本",
    ...updates,
  }
}

describe("课程表单纯函数", () => {
  it("课程名称必填", () => {
    const result = validateCourseForm(formValues({ name: "  " }), 20)
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBe("请输入课程名称")
  })

  it("结束节次不能早于开始节次", () => {
    const result = validateCourseForm(formValues({ startSection: 8, endSection: 5 }), 20)
    expect(result.errors.sections).toContain("结束节次不能早于开始节次")
  })

  it("自定义周次不能为空", () => {
    const result = validateCourseForm(formValues({ weekMode: "custom", customWeeks: "" }), 20)
    expect(result.errors.weeks).toBe("周次表达不能为空")
  })

  it("周次不能超过学期总周数", () => {
    const result = validateCourseForm(
      formValues({ weekMode: "custom", customWeeks: "1-21周" }),
      20,
    )
    expect(result.errors.weeks).toContain("不能超过学期总周数 20")
  })

  it.each([
    ["continuous", "2-5周", [2, 3, 4, 5]],
    ["odd", "1-7周单周", [1, 3, 5, 7]],
    ["even", "2-8周双周", [2, 4, 6, 8]],
  ] as const)("%s 周次模式生成并解析正确", (weekMode, expression, weeks) => {
    const values = formValues({ weekMode, startWeek: weeks[0], endWeek: weeks.at(-1) ?? 1 })
    expect(buildWeekExpression(values)).toBe(expression)
    expect(validateCourseForm(values, 20).draft?.weeks).toEqual(weeks)
  })

  it("自定义模式复用现有周次解析器", () => {
    const result = validateCourseForm(
      formValues({ weekMode: "custom", customWeeks: "1,3,5,7周" }),
      20,
    )
    expect(result.draft?.weeks).toEqual([1, 3, 5, 7])
  })

  it("编辑模式回填全部课程字段", () => {
    const values = createCourseFormValues(course(), 20)
    expect(values).toMatchObject({
      name: "环境设计",
      teacher: "冈田庸平",
      academicAdvisor: "王词光",
      classroom: "A7-322",
      dayOfWeek: 1,
      startSection: 5,
      endSection: 8,
      weekMode: "continuous",
      startWeek: 2,
      endWeek: 5,
      color: "#789A88",
      note: "真实课表样本",
    })
  })

  it("非连续周次编辑时不丢失原值", () => {
    const values = createCourseFormValues(course({ weeks: [1, 4, 7, 12] }), 20)
    expect(values).toMatchObject({ weekMode: "custom", customWeeks: "1,4,7,12" })
  })

  it("保存时裁剪文本并保留空的可选字段为 undefined", () => {
    const result = validateCourseForm(
      formValues({ name: "  体育3  ", teacher: " ", classroom: " A6-320 " }),
      20,
    )
    expect(result.draft).toMatchObject({ name: "体育3", classroom: "A6-320" })
    expect(result.draft?.teacher).toBeUndefined()
  })

  it("动态作息时间预览覆盖连续多节", () => {
    expect(getCourseTimeLabel(course(), DEFAULT_SECTION_TIMES)).toBe("13:20 - 17:00")
  })

  it("检测同星期、重叠节次和重叠周次的冲突", () => {
    const candidate = course({ id: "candidate", weeks: [4, 5, 6] })
    const matches = findCourseConflictMatches(candidate, [course()])
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ overlappingWeeks: [4, 5], startSection: 5, endSection: 8 })
  })

  it("编辑时排除课程自身", () => {
    const current = course()
    expect(findCourseConflictMatches(current, [current], current.id)).toEqual([])
  })

  it("同一时段但周次不同不产生冲突", () => {
    const candidate = course({ id: "candidate", weeks: [10, 11, 12] })
    expect(findCourseConflictMatches(candidate, [course()])).toEqual([])
  })

  it("连续创建的课程 id 保持唯一", () => {
    expect(createUniqueId()).not.toBe(createUniqueId())
  })

  it("未选择颜色时保留空值交给稳定哈希着色", () => {
    const draft = validateCourseForm(formValues({ color: "" }), 20).draft
    expect(draft).toBeDefined()
    if (!draft) throw new Error("表单应生成可保存的课程草稿")
    expect(draft.color).toBe("")
  })
})
