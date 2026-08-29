import type { Course, DayOfWeek, SectionNumber } from "@/types/timetable"

export type CohortYear = 2024 | 2025

interface BuiltinCourseInput {
  id: string
  name: string
  teacher?: string
  academicAdvisor?: string
  classroom?: string
  dayOfWeek: DayOfWeek
  startSection: SectionNumber
  endSection: SectionNumber
  weeks: readonly number[]
}

function builtin(input: BuiltinCourseInput): Course {
  return { ...input, weeks: [...input.weeks], color: "" }
}

const weeks = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, index) => start + index)
const w1to8 = weeks(1, 8)
const w1to12 = weeks(1, 12)
const w1to16 = weeks(1, 16)

/** Generated from reference/中外合作办学课表.xlsx with the production Excel parser. */
export const BUILTIN_COHORT_24: readonly Course[] = [
  builtin({ id: "builtin-24-5ek7o", name: "动态图形设计", teacher: "丁宗超", classroom: "A6-320", dayOfWeek: 1, startSection: 5, endSection: 8, weeks: w1to8 }),
  builtin({ id: "builtin-24-c7yxyr", name: "技术日语（二）", teacher: "江妮", classroom: "A6-320", dayOfWeek: 2, startSection: 3, endSection: 4, weeks: w1to8 }),
  builtin({ id: "builtin-24-8v9bxa", name: "技术日语（二）", teacher: "江妮", classroom: "A6-320", dayOfWeek: 3, startSection: 3, endSection: 4, weeks: w1to8 }),
  builtin({ id: "builtin-24-a0jan2", name: "影视特效制作", teacher: "张俭丰", classroom: "A6-320", dayOfWeek: 3, startSection: 5, endSection: 8, weeks: w1to8 }),
  builtin({ id: "builtin-24-v6gs2l", name: "技术日语（二）", teacher: "江妮", classroom: "A6-320", dayOfWeek: 4, startSection: 1, endSection: 2, weeks: w1to8 }),
  builtin({ id: "builtin-24-19bv0h5", name: "动态图形设计", teacher: "丁宗超", classroom: "A6-320", dayOfWeek: 4, startSection: 5, endSection: 8, weeks: w1to8 }),
  builtin({ id: "builtin-24-nf0rfg", name: "技术日语（二）", teacher: "江妮", classroom: "A6-320", dayOfWeek: 5, startSection: 3, endSection: 4, weeks: w1to8 }),
  builtin({ id: "builtin-24-1mmrmk4", name: "影视特效制作", teacher: "张俭丰", classroom: "A6-320", dayOfWeek: 5, startSection: 5, endSection: 8, weeks: w1to8 }),
]

export const BUILTIN_COHORT_25: readonly Course[] = [
  builtin({ id: "builtin-25-3ygkq0", name: "大学生就业指导", teacher: "张宪义", classroom: "A7-322", dayOfWeek: 1, startSection: 1, endSection: 2, weeks: w1to8 }),
  builtin({ id: "builtin-25-191bajk", name: "综合日语（三）", teacher: "丛莉", classroom: "A7-322", dayOfWeek: 1, startSection: 3, endSection: 4, weeks: w1to16 }),
  builtin({ id: "builtin-25-hxcfji", name: "环境设计", teacher: "冈田庸平", academicAdvisor: "王词光", classroom: "A7-322", dayOfWeek: 1, startSection: 5, endSection: 8, weeks: weeks(2, 5) }),
  builtin({ id: "builtin-25-19kdp8b", name: "视觉设计", teacher: "小山贤一", academicAdvisor: "范迎南", classroom: "A7-322", dayOfWeek: 1, startSection: 5, endSection: 8, weeks: weeks(10, 12) }),
  builtin({ id: "builtin-25-1fjrcfv", name: "角色造型", teacher: "吉松大志", academicAdvisor: "曹文瑞", classroom: "A7-322", dayOfWeek: 1, startSection: 5, endSection: 8, weeks: weeks(13, 16) }),
  builtin({ id: "builtin-25-753r7x", name: "综合日语（三）", teacher: "丛莉", classroom: "A7-322", dayOfWeek: 2, startSection: 1, endSection: 2, weeks: w1to16 }),
  builtin({ id: "builtin-25-tbxwhb", name: "习近平新时代中国特色社会主义思想概论", teacher: "孙英剀", classroom: "A7-322", dayOfWeek: 2, startSection: 3, endSection: 4, weeks: w1to12 }),
  builtin({ id: "builtin-25-1qo5x6", name: "环境设计", teacher: "冈田庸平", academicAdvisor: "王词光", classroom: "A7-322", dayOfWeek: 2, startSection: 5, endSection: 8, weeks: weeks(2, 4) }),
  builtin({ id: "builtin-25-g2jhuy", name: "视觉设计", teacher: "小山贤一", academicAdvisor: "范迎南", classroom: "A7-322", dayOfWeek: 2, startSection: 5, endSection: 8, weeks: weeks(10, 12) }),
  builtin({ id: "builtin-25-pgrljv", name: "角色造型", teacher: "吉松大志", academicAdvisor: "曹文瑞", classroom: "A7-322", dayOfWeek: 2, startSection: 5, endSection: 8, weeks: weeks(13, 15) }),
  builtin({ id: "builtin-25-1cbnpoy", name: "体育3", teacher: "王海", dayOfWeek: 3, startSection: 1, endSection: 2, weeks: w1to16 }),
  builtin({ id: "builtin-25-29ncta", name: "计算机数学基础", teacher: "夏阳", classroom: "A7-322", dayOfWeek: 3, startSection: 3, endSection: 4, weeks: w1to12 }),
  builtin({ id: "builtin-25-dp0c9n", name: "环境设计", teacher: "冈田庸平", academicAdvisor: "王词光", classroom: "A7-322", dayOfWeek: 3, startSection: 5, endSection: 8, weeks: weeks(2, 4) }),
  builtin({ id: "builtin-25-1jgzq10", name: "视觉设计", teacher: "小山贤一", academicAdvisor: "范迎南", classroom: "A7-322", dayOfWeek: 3, startSection: 5, endSection: 8, weeks: weeks(9, 12) }),
  builtin({ id: "builtin-25-fbdm8c", name: "角色造型", teacher: "吉松大志", academicAdvisor: "曹文瑞", classroom: "A7-322", dayOfWeek: 3, startSection: 5, endSection: 8, weeks: weeks(13, 15) }),
  builtin({ id: "builtin-25-fg1n8z", name: "综合日语（三）", teacher: "丛莉", classroom: "A7-322", dayOfWeek: 4, startSection: 1, endSection: 2, weeks: w1to16 }),
  builtin({ id: "builtin-25-1ax2ufl", name: "习近平新时代中国特色社会主义思想概论", teacher: "孙英剀", classroom: "A7-322", dayOfWeek: 4, startSection: 3, endSection: 4, weeks: w1to12 }),
  builtin({ id: "builtin-25-1mejb78", name: "环境设计", teacher: "冈田庸平", academicAdvisor: "王词光", classroom: "A7-322", dayOfWeek: 4, startSection: 5, endSection: 8, weeks: weeks(2, 4) }),
  builtin({ id: "builtin-25-1wxbu1a", name: "视觉设计", teacher: "小山贤一", academicAdvisor: "范迎南", classroom: "A7-322", dayOfWeek: 4, startSection: 5, endSection: 8, weeks: weeks(9, 11) }),
  builtin({ id: "builtin-25-atsrz5", name: "角色造型", teacher: "吉松大志", academicAdvisor: "曹文瑞", classroom: "A7-322", dayOfWeek: 4, startSection: 5, endSection: 8, weeks: weeks(13, 15) }),
  builtin({ id: "builtin-25-dus54s", name: "计算机数学基础", teacher: "夏阳", classroom: "A7-322", dayOfWeek: 5, startSection: 1, endSection: 2, weeks: w1to12 }),
  builtin({ id: "builtin-25-19jamwe", name: "四史概述", teacher: "董蕾", classroom: "A7-322", dayOfWeek: 5, startSection: 3, endSection: 4, weeks: weeks(7, 14) }),
  builtin({ id: "builtin-25-wt41hh", name: "环境设计", teacher: "冈田庸平", academicAdvisor: "王词光", classroom: "A7-322", dayOfWeek: 5, startSection: 5, endSection: 8, weeks: weeks(2, 4) }),
  builtin({ id: "builtin-25-1isuaxv", name: "视觉设计", teacher: "小山贤一", academicAdvisor: "范迎南", classroom: "A7-322", dayOfWeek: 5, startSection: 5, endSection: 8, weeks: weeks(9, 11) }),
  builtin({ id: "builtin-25-gs40w2", name: "角色造型", teacher: "吉松大志", academicAdvisor: "曹文瑞", classroom: "A7-322", dayOfWeek: 5, startSection: 5, endSection: 8, weeks: weeks(13, 15) }),
]

export function getBuiltinCourses(cohortYear: CohortYear | undefined): Course[] {
  const source = cohortYear === 2024 ? BUILTIN_COHORT_24 : cohortYear === 2025 ? BUILTIN_COHORT_25 : []
  return source.map((course) => ({ ...course, weeks: [...course.weeks] }))
}

export function getVisibleCourses(cohortYear: CohortYear | undefined, userCourses: readonly Course[]): Course[] {
  return [...getBuiltinCourses(cohortYear), ...userCourses]
}

export function isBuiltinCourse(course: Pick<Course, "id">): boolean {
  return course.id.startsWith("builtin-24-") || course.id.startsWith("builtin-25-")
}
