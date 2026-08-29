import { readFileSync } from "node:fs"
import path from "node:path"

import * as XLSX from "xlsx"
import { describe, expect, it } from "vitest"

import { coursesConflict, getCourseConflicts } from "@/lib/conflict"
import {
  extractAcademicAdvisor,
  extractClassroom,
  extractTeacher,
  normalizeCellText,
  parseCourseCell,
  parseWorkbook,
} from "@/lib/importTimetable"
import { createTimetableStore } from "@/store/timetableStore"
import { MemoryStorage } from "@/test/memoryStorage"
import { getCoursesForWeek } from "@/lib/timetable"
import { getCourseItemCount, getUniqueCourseCount, getWeeklyCourseStats } from "@/lib/statistics"

const fixture = new Uint8Array(
  readFileSync(path.resolve(process.cwd(), "reference/中外合作办学课表.xlsx")),
)

function parseRealWorkbook() {
  return parseWorkbook(fixture, {
    sourceFileName: "中外合作办学课表.xlsx",
    totalWeeks: 20,
  })
}

function findResult(workbook: ReturnType<typeof parseRealWorkbook>, label: string) {
  const option = workbook.availableTimetables.find((item) => item.label === label)
  if (!option) throw new Error(`未找到 ${label}`)
  return workbook.results[option.id]
}

describe("Excel 课程表 Parser", () => {
  it("规范化换行与空白", () => {
    expect(normalizeCellText("  环境设计\r\n\n授课教师：冈田庸平  ")).toBe(
      "环境设计\n授课教师：冈田庸平",
    )
  })

  it("识别真实多课程单元格，且教师与导师不混淆", () => {
    const parsed = parseCourseCell(`环境设计（2-5周）A7-322
授课教师：冈田庸平  学术导师：王词光
视觉设计（10-12周）A7-322
授课教师:小山贤一  学术导师：范迎南`)

    expect(parsed).toEqual([
      expect.objectContaining({
        name: "环境设计",
        rawWeekText: "2-5周",
        teacher: "冈田庸平",
        academicAdvisor: "王词光",
        classroom: "A7-322",
      }),
      expect.objectContaining({
        name: "视觉设计",
        rawWeekText: "10-12周",
        teacher: "小山贤一",
        academicAdvisor: "范迎南",
        classroom: "A7-322",
      }),
    ])
  })

  it("课程名中的括号不会被误当作周次", () => {
    expect(parseCourseCell("综合日语（三）（1-16周）\n丛莉 A7-322")[0]).toMatchObject({
      name: "综合日语（三）",
      rawWeekText: "1-16周",
      teacher: "丛莉",
    })
  })

  it("教师优先取授课教师字段，导师单独保存", () => {
    const text = "授课教师：冈田庸平 学术导师：王词光"
    expect(extractTeacher(text)).toBe("冈田庸平")
    expect(extractAcademicAdvisor(text)).toBe("王词光")
  })

  it("教室识别保持保守，不将数字误判为教室", () => {
    expect(extractClassroom("体育3（1-16周） 王海")).toBeUndefined()
    expect(extractClassroom("技术日语（二） A6-320")).toBe("A6-320")
  })

  it("真实工作簿识别课表和两个可选年级", () => {
    const workbook = parseRealWorkbook()
    expect(workbook.metadata.sheetNames).toEqual(["课表"])
    expect(workbook.availableTimetables.map((item) => item.label)).toEqual([
      "24中外合作办学",
      "25中外合作办学",
    ])
    expect(workbook.availableTimetables.map((item) => item.column)).toEqual(["C", "D"])
  })

  it("真实工作簿统计与 Phase 0 一致", () => {
    const workbook = parseRealWorkbook()
    expect(workbook.metadata).toMatchObject({
      mergedRangeCount: 39,
      physicalCourseCells: 23,
      parsedCourseItems: 33,
    })
    expect(findResult(workbook, "24中外合作办学").metadata).toMatchObject({
      physicalCourseCells: 8,
      parsedCourseItems: 8,
    })
    expect(findResult(workbook, "25中外合作办学").metadata).toMatchObject({
      physicalCourseCells: 15,
      parsedCourseItems: 25,
    })
  })

  it("真实 25 级 fixture 统计为 9 门课程和 25 个课程项", () => {
    const courses = findResult(parseRealWorkbook(), "25中外合作办学").courses
    expect(getUniqueCourseCount(courses)).toBe(9)
    expect(getCourseItemCount(courses)).toBe(25)
    expect(getWeeklyCourseStats(courses, 20)[2].sections).toBeGreaterThan(0)
  })

  it("合并单元格生成连续节次，不生成重复课程", () => {
    const courses = findResult(parseRealWorkbook(), "25中外合作办学").courses
    const employment = courses.find((course) => course.name === "大学生就业指导")
    expect(employment).toMatchObject({ dayOfWeek: 1, startSection: 1, endSection: 2 })
    expect(courses.filter((course) => course.name === "大学生就业指导")).toHaveLength(1)
  })

  it("环境、视觉和角色设计按不同周次拆分", () => {
    const courses = findResult(parseRealWorkbook(), "25中外合作办学").courses
    const monday = courses.filter(
      (course) => course.dayOfWeek === 1 && course.startSection === 5 && course.endSection === 8,
    )
    expect(monday).toEqual([
      expect.objectContaining({
        name: "环境设计",
        weeks: [2, 3, 4, 5],
        teacher: "冈田庸平",
        academicAdvisor: "王词光",
        classroom: "A7-322",
      }),
      expect.objectContaining({ name: "视觉设计", weeks: [10, 11, 12] }),
      expect.objectContaining({ name: "角色造型", weeks: [13, 14, 15, 16] }),
    ])
  })

  it("无教室的体育3仍会成功导入并产生可读 warning", () => {
    const result = findResult(parseRealWorkbook(), "25中外合作办学")
    const sports = result.courses.find((course) => course.name === "体育3")
    expect(sports).toMatchObject({
      teacher: "王海",
      dayOfWeek: 3,
      startSection: 1,
      endSection: 2,
    })
    expect(sports?.classroom).toBeUndefined()
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "UNRECOGNIZED_CLASSROOM", cell: "D20" }),
    )
  })

  it("重复解析同一文件得到相同 Course ID", () => {
    const first = findResult(parseRealWorkbook(), "25中外合作办学").courses
    const second = findResult(parseRealWorkbook(), "25中外合作办学").courses
    expect(second.map((course) => course.id)).toEqual(first.map((course) => course.id))
  })

  it("重复导入同一真实课表只新增一次，且保留手动课程", () => {
    const store = createTimetableStore({ storage: new MemoryStorage() })
    store.getState().addCourse({
      id: "manual-course",
      name: "手动创建课程",
      dayOfWeek: 7,
      startSection: 1,
      endSection: 1,
      weeks: [1],
      color: "",
    })
    const importedCourses = findResult(parseRealWorkbook(), "25中外合作办学").courses

    expect(store.getState().importCourses(importedCourses)).toEqual({ added: 25, skipped: 0 })
    expect(store.getState().importCourses(importedCourses)).toEqual({ added: 0, skipped: 25 })
    expect(store.getState().courses).toHaveLength(26)
    expect(store.getState().courses[0].name).toBe("手动创建课程")
  })

  it("真实 25 级课程会按周次显示设计课程，且三者不冲突", () => {
    const courses = findResult(parseRealWorkbook(), "25中外合作办学").courses
    const namesForWeek = (week: number) => getCoursesForWeek(courses, week).map((course) => course.name)

    expect(namesForWeek(3)).toContain("环境设计")
    expect(namesForWeek(3)).not.toContain("视觉设计")
    expect(namesForWeek(3)).not.toContain("角色造型")
    expect(namesForWeek(11)).toContain("视觉设计")
    expect(namesForWeek(11)).not.toContain("环境设计")
    expect(namesForWeek(11)).not.toContain("角色造型")
    expect(namesForWeek(14)).toContain("角色造型")
    expect(namesForWeek(14)).not.toContain("环境设计")
    expect(namesForWeek(14)).not.toContain("视觉设计")

    const mondayDesigns = courses.filter(
      (course) => course.dayOfWeek === 1 && course.startSection === 5 && course.endSection === 8,
    )
    expect(coursesConflict(mondayDesigns[0], mondayDesigns[1])).toBe(false)
    expect(coursesConflict(mondayDesigns[1], mondayDesigns[2])).toBe(false)
  })

  it("重复导入不会覆盖已编辑课程；删除后可以重新导入恢复", () => {
    const store = createTimetableStore({ storage: new MemoryStorage() })
    const importedCourses = findResult(parseRealWorkbook(), "25中外合作办学").courses
    const target = importedCourses.find((course) => course.name === "大学生就业指导")
    if (!target) throw new Error("未找到验收课程")

    store.getState().importCourses(importedCourses)
    store.getState().updateCourse(target.id, { teacher: "用户修改后的教师", note: "保留用户备注" })
    expect(store.getState().importCourses(importedCourses)).toEqual({ added: 0, skipped: 25 })
    expect(store.getState().courses.find((course) => course.id === target.id)).toMatchObject({
      teacher: "用户修改后的教师",
      note: "保留用户备注",
    })

    store.getState().deleteCourse(target.id)
    expect(store.getState().importCourses(importedCourses)).toEqual({ added: 1, skipped: 24 })
    const restored = store.getState().courses.find((course) => course.id === target.id)
    expect(restored?.teacher).toBe(target.teacher)
    expect(restored?.note).toBeUndefined()
  })

  it("导入课程与手动课程冲突时仍导入，并可由纯函数识别", () => {
    const store = createTimetableStore({ storage: new MemoryStorage() })
    store.getState().addCourse({
      id: "manual-conflict",
      name: "手动冲突课程",
      dayOfWeek: 1,
      startSection: 1,
      endSection: 2,
      weeks: [1],
      color: "",
    })
    const importedCourses = findResult(parseRealWorkbook(), "25中外合作办学").courses

    expect(store.getState().importCourses(importedCourses)).toEqual({ added: 25, skipped: 0 })
    expect(getCourseConflicts(store.getState().courses)).toContainEqual(
      expect.objectContaining({ courseAId: "manual-conflict" }),
    )
  })

  it("无课表结构的工作簿给出错误而不抛出", () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["普通表格"]]), "数据")
    const data = XLSX.write(workbook, { type: "array", bookType: "xlsx" })
    const result = parseWorkbook(data, { sourceFileName: "普通表格.xlsx" })
    expect(result.availableTimetables).toEqual([])
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "NO_TIMETABLE_STRUCTURE", severity: "error" }),
    )
  })

  it("非 Excel 扩展名在本地解析前被拒绝", () => {
    const result = parseWorkbook(fixture, { sourceFileName: "课程表.txt" })
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "INVALID_FILE_TYPE", severity: "error" }),
    )
  })

  it("空或损坏的 Excel 数据会返回可展示的错误", () => {
    const result = parseWorkbook(new Uint8Array(), { sourceFileName: "损坏课表.xlsx" })
    expect(result.availableTimetables).toEqual([])
    expect(result.warnings.some((warning) => warning.severity === "error")).toBe(true)
  })
})
