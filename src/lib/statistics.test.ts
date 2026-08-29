import { describe, expect, it } from "vitest"
import { getBusiestWeekday, getConflictStats, getCourseItemCount, getCurrentWeekStats, getTodoStats, getUniqueCourseCount, getWeekdayCourseLoad, getWeeklyCourseStats } from "@/lib/statistics"
import type { Course, Todo } from "@/types/timetable"

const course = (overrides: Partial<Course> = {}): Course => ({ id: "a", name: "环境设计", dayOfWeek: 1, startSection: 5, endSection: 8, weeks: [2,3,4,5], color: "", ...overrides })
const todo = (overrides: Partial<Todo> = {}): Todo => ({ id: "t", title: "作业", type: "assignment", completed: false, createdAt: "2026-01-01T00:00:00.000Z", ...overrides })

describe("statistics", () => {
  it("按名称统计不同课程与课程项", () => { const items=[course(),course({id:"b",weeks:[6]})]; expect(getUniqueCourseCount(items)).toBe(1); expect(getCourseItemCount(items)).toBe(2) })
  it("当前周统计节数与有课天数", () => { expect(getCurrentWeekStats([course(),course({id:"b",dayOfWeek:2,startSection:1,endSection:2,weeks:[3]})],3)).toEqual({items:2,sections:6,activeDays:2}) })
  it("周负荷遵循周次，不会同时计算互斥设计课程", () => { const items=[course(),course({id:"v",name:"视觉设计",weeks:[10,11,12]}),course({id:"r",name:"角色造型",weeks:[13,14]})]; expect(getWeeklyCourseStats(items,14)[2].sections).toBe(4); expect(getWeeklyCourseStats(items,14)[10].sections).toBe(4); expect(getWeeklyCourseStats(items,14)[13].sections).toBe(4) })
  it("学期星期负荷与最忙星期", () => { const load=getWeekdayCourseLoad([course(),course({id:"b",dayOfWeek:2,startSection:1,endSection:2,weeks:[1]})]); expect(load[1]).toBe(16); expect(getBusiestWeekday(load)).toEqual({dayOfWeek:1,sections:16}) })
  it("Todo 与空数据安全", () => { const now=new Date("2026-01-02T12:00:00Z"); expect(getTodoStats([],now)).toEqual({total:0,completed:0,remaining:0,overdue:0}); expect(getTodoStats([todo({dueAt:"2026-01-01T12:00:00Z"}),todo({id:"d",completed:true})],now)).toMatchObject({total:2,completed:1,remaining:1,overdue:1,completionRate:50}) })
  it("冲突统计区分学期与当前周", () => { const items=[course({startSection:1,endSection:2,weeks:[1,2]}),course({id:"b",startSection:2,endSection:3,weeks:[2,3]})]; expect(getConflictStats(items,1)).toEqual({semester:1,currentWeek:0}); expect(getConflictStats(items,2)).toEqual({semester:1,currentWeek:1}) })
})
