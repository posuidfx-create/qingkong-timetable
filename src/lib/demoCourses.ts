import type { Course, DayOfWeek, SectionNumber } from "@/types/timetable"

function weeks(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

interface DemoCourseOptions {
  id: string
  name: string
  dayOfWeek: DayOfWeek
  startSection: SectionNumber
  endSection: SectionNumber
  weeks: number[]
  teacher: string
  classroom?: string
  academicAdvisor?: string
  color: string
}

function course(options: DemoCourseOptions): Course {
  return { ...options }
}

const sharedMondayCourses: readonly Course[] = [
  course({
    id: "demo-employment-monday",
    name: "大学生就业指导",
    dayOfWeek: 1,
    startSection: 1,
    endSection: 2,
    weeks: weeks(1, 8),
    teacher: "张宪义",
    classroom: "A7-322",
    color: "#8795B5",
  }),
  course({
    id: "demo-japanese-monday",
    name: "综合日语（三）",
    dayOfWeek: 1,
    startSection: 3,
    endSection: 4,
    weeks: weeks(1, 16),
    teacher: "丛莉",
    classroom: "A7-322",
    color: "#7695A8",
  }),
]

const rotatingMondayCourses: readonly Course[] = [
  course({
    id: "demo-environment-design",
    name: "环境设计",
    dayOfWeek: 1,
    startSection: 5,
    endSection: 8,
    weeks: weeks(2, 5),
    teacher: "冈田庸平",
    academicAdvisor: "王词光",
    classroom: "A7-322",
    color: "#789A88",
  }),
  course({
    id: "demo-visual-design",
    name: "视觉设计",
    dayOfWeek: 1,
    startSection: 5,
    endSection: 8,
    weeks: weeks(10, 12),
    teacher: "小山贤一",
    academicAdvisor: "范迎南",
    classroom: "A7-322",
    color: "#9584AD",
  }),
  course({
    id: "demo-character-design",
    name: "角色造型",
    dayOfWeek: 1,
    startSection: 5,
    endSection: 8,
    weeks: weeks(13, 16),
    teacher: "吉松大志",
    academicAdvisor: "曹文瑞",
    classroom: "A7-322",
    color: "#AE8978",
  }),
]

export const DEMO_COURSES: readonly Course[] = [
  ...sharedMondayCourses,
  ...rotatingMondayCourses,
  course({
    id: "demo-japanese-tuesday",
    name: "综合日语（三）",
    dayOfWeek: 2,
    startSection: 1,
    endSection: 2,
    weeks: weeks(1, 16),
    teacher: "丛莉",
    classroom: "A7-322",
    color: "#7695A8",
  }),
  course({
    id: "demo-thought-tuesday",
    name: "习近平新时代中国特色社会主义思想概论",
    dayOfWeek: 2,
    startSection: 3,
    endSection: 4,
    weeks: weeks(1, 12),
    teacher: "孙英剑",
    classroom: "A7-322",
    color: "#A28E72",
  }),
  course({
    id: "demo-sports-wednesday",
    name: "体育3",
    dayOfWeek: 3,
    startSection: 1,
    endSection: 2,
    weeks: weeks(1, 16),
    teacher: "王海",
    color: "#718F9B",
  }),
  course({
    id: "demo-math-wednesday",
    name: "计算机数学基础",
    dayOfWeek: 3,
    startSection: 3,
    endSection: 4,
    weeks: weeks(1, 12),
    teacher: "夏阳",
    classroom: "A7-322",
    color: "#7F8DA8",
  }),
  course({
    id: "demo-japanese-thursday",
    name: "综合日语（三）",
    dayOfWeek: 4,
    startSection: 1,
    endSection: 2,
    weeks: weeks(1, 16),
    teacher: "丛莉",
    classroom: "A7-322",
    color: "#7695A8",
  }),
  course({
    id: "demo-thought-thursday",
    name: "习近平新时代中国特色社会主义思想概论",
    dayOfWeek: 4,
    startSection: 3,
    endSection: 4,
    weeks: weeks(1, 12),
    teacher: "孙英剑",
    classroom: "A7-322",
    color: "#A28E72",
  }),
  course({
    id: "demo-math-friday",
    name: "计算机数学基础",
    dayOfWeek: 5,
    startSection: 1,
    endSection: 2,
    weeks: weeks(1, 12),
    teacher: "夏阳",
    classroom: "A7-322",
    color: "#7F8DA8",
  }),
  course({
    id: "demo-history-friday",
    name: "四史概述",
    dayOfWeek: 5,
    startSection: 3,
    endSection: 4,
    weeks: weeks(7, 14),
    teacher: "董蕾",
    classroom: "A7-322",
    color: "#A08088",
  }),
]

export const DEMO_ROTATING_COURSES = rotatingMondayCourses
