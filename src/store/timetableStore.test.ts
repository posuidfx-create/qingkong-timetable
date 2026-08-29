import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  APP_STORAGE_KEY,
  createDefaultPersistedState,
  exportAppData,
  previewImportedAppData,
  savePersistedState,
} from "@/lib/storage"
import { createTimetableStore } from "@/store/timetableStore"
import { MemoryStorage } from "@/test/memoryStorage"
import type { Course, Todo } from "@/types/timetable"

function createCourse(id = "course-1"): Course {
  return {
    id,
    name: "环境设计",
    teacher: "冈田庸平",
    academicAdvisor: "王词光",
    classroom: "A7-322",
    dayOfWeek: 1,
    startSection: 5,
    endSection: 8,
    weeks: [2, 3, 4, 5],
    color: "#5b8def",
  }
}

function createTodo(id = "todo-1"): Todo {
  return {
    id,
    title: "复习环境设计",
    type: "course",
    completed: false,
    courseId: "course-1",
    createdAt: "2026-08-31T08:00:00.000Z",
  }
}

describe("timetableStore", () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  afterEach(() => {
    storage.clear()
  })

  it("addCourse 新增课程", () => {
    const store = createTimetableStore({ storage })
    store.getState().addCourse(createCourse())
    expect(store.getState().courses).toEqual([createCourse()])
  })

  it("updateCourse 通过 id 更新且不能替换 id", () => {
    const store = createTimetableStore({ storage })
    store.getState().addCourse(createCourse())
    store.getState().updateCourse("course-1", { name: "视觉设计" })

    expect(store.getState().courses[0]).toMatchObject({
      id: "course-1",
      name: "视觉设计",
    })
  })

  it("deleteCourse 通过 id 删除课程", () => {
    const store = createTimetableStore({ storage })
    store.getState().addCourse(createCourse())
    store.getState().deleteCourse("course-1")
    expect(store.getState().courses).toEqual([])
  })

  it("删除关联课程不会删除或破坏 Todo", () => {
    const store = createTimetableStore({ storage })
    store.getState().addCourse(createCourse())
    store.getState().addTodo(createTodo())
    store.getState().deleteCourse("course-1")

    expect(store.getState().courses).toEqual([])
    expect(store.getState().todos).toEqual([createTodo()])
  })

  it("clearCourses 只清空课程", () => {
    const store = createTimetableStore({ storage })
    store.getState().addCourse(createCourse())
    store.getState().addTodo(createTodo())
    store.getState().updateSettings({ theme: "dark" })
    store.getState().clearCourses()

    expect(store.getState().courses).toEqual([])
    expect(store.getState().todos).toHaveLength(1)
    expect(store.getState().settings.theme).toBe("dark")
  })

  it("clearAppData 清空课程、Todo 与设置并持久化默认状态", () => {
    const store = createTimetableStore({ storage })
    store.getState().addCourse(createCourse())
    store.getState().addTodo(createTodo())
    store.getState().updateSettings({ theme: "dark", showWeekends: true })

    expect(store.getState().clearAppData()).toBe(true)
    expect(store.getState().courses).toEqual([])
    expect(store.getState().todos).toEqual([])
    expect(store.getState().settings.theme).toBe("system")
    expect(createTimetableStore({ storage }).getState().sectionTimes).toHaveLength(11)
  })

  it("importCourses 追加导入并按 id 去重", () => {
    const store = createTimetableStore({ storage })
    store.getState().addCourse(createCourse("existing"))

    const imported = store
      .getState()
      .importCourses([
        createCourse("existing"),
        createCourse("new-1"),
        createCourse("new-1"),
        createCourse("new-2"),
      ])

    expect(imported).toEqual({ added: 2, skipped: 2 })
    expect(store.getState().courses.map((course) => course.id)).toEqual([
      "existing",
      "new-1",
      "new-2",
    ])
  })

  it("addTodo 新增 Todo", () => {
    const store = createTimetableStore({ storage })
    store.getState().addTodo(createTodo())
    expect(store.getState().todos).toEqual([createTodo()])
  })

  it("updateTodo 通过 id 更新 Todo", () => {
    const store = createTimetableStore({ storage })
    store.getState().addTodo(createTodo())
    store.getState().updateTodo("todo-1", { title: "完成作业" })
    expect(store.getState().todos[0].title).toBe("完成作业")
  })

  it("deleteTodo 通过 id 删除 Todo", () => {
    const store = createTimetableStore({ storage })
    store.getState().addTodo(createTodo())
    store.getState().deleteTodo("todo-1")
    expect(store.getState().todos).toEqual([])
  })

  it("toggleTodo 切换完成状态", () => {
    const store = createTimetableStore({ storage })
    store.getState().addTodo(createTodo())
    store.getState().toggleTodo("todo-1")
    expect(store.getState().todos[0].completed).toBe(true)
    store.getState().toggleTodo("todo-1")
    expect(store.getState().todos[0].completed).toBe(false)
  })

  it("updateSemester 更新学期", () => {
    const store = createTimetableStore({ storage })
    expect(store.getState().updateSemester({ name: "2027 春季学期" })).toBe(true)
    expect(store.getState().semester.name).toBe("2027 春季学期")
  })

  it("学期总周数缩短时 clamp currentWeek", () => {
    const store = createTimetableStore({ storage })
    store.getState().setCurrentWeek(18)
    store.getState().updateSemester({ totalWeeks: 12 })
    expect(store.getState().currentWeek).toBe(12)
  })

  it("拒绝无效学期且不改变当前有效状态", () => {
    const store = createTimetableStore({ storage })
    const originalSemester = store.getState().semester
    expect(store.getState().updateSemester({ totalWeeks: 0 })).toBe(false)
    expect(store.getState().semester).toBe(originalSemester)
  })

  it("setCurrentWeek 始终限制在有效教学周内", () => {
    const store = createTimetableStore({ storage })
    store.getState().setCurrentWeek(0)
    expect(store.getState().currentWeek).toBe(1)
    store.getState().setCurrentWeek(99)
    expect(store.getState().currentWeek).toBe(20)
  })

  it("updateSectionTime 修改指定节次且保持节次唯一", () => {
    const store = createTimetableStore({ storage })
    expect(
      store.getState().updateSectionTime(1, { startTime: "08:10", endTime: "08:50" }),
    ).toBe(true)

    expect(store.getState().sectionTimes[0]).toEqual({
      section: 1,
      startTime: "08:10",
      endTime: "08:50",
    })
    expect(new Set(store.getState().sectionTimes.map((item) => item.section)).size).toBe(11)
  })

  it("updateSectionTime 拒绝无效时间范围", () => {
    const store = createTimetableStore({ storage })
    const original = store.getState().sectionTimes
    expect(store.getState().updateSectionTime(1, { startTime: "09:00" })).toBe(false)
    expect(store.getState().sectionTimes).toBe(original)
  })

  it("resetSectionTimes 恢复真实默认作息", () => {
    const store = createTimetableStore({ storage })
    store.getState().updateSectionTime(1, { startTime: "08:10", endTime: "08:50" })
    store.getState().resetSectionTimes()

    expect(store.getState().sectionTimes[0]).toEqual({
      section: 1,
      startTime: "08:00",
      endTime: "08:45",
    })
    expect(store.getState().sectionTimes).toHaveLength(11)
  })

  it("updateSettings 支持部分更新", () => {
    const store = createTimetableStore({ storage })
    store.getState().updateSettings({ theme: "dark" })

    expect(store.getState().settings).toMatchObject({
      theme: "dark",
      weekStartsOn: 1,
      showWeekends: false,
      compactCourseCards: false,
    })
  })

  it("长期数据变化后刷新重建 Store 仍可恢复", () => {
    const firstStore = createTimetableStore({ storage })
    firstStore.getState().addCourse(createCourse())
    firstStore.getState().addTodo(createTodo())
    firstStore.getState().updateSettings({ theme: "dark" })

    const refreshedStore = createTimetableStore({ storage })
    expect(refreshedStore.getState().courses).toEqual([createCourse()])
    expect(refreshedStore.getState().todos).toEqual([createTodo()])
    expect(refreshedStore.getState().settings.theme).toBe("dark")
  })

  it("课表设置、学期与作息修改刷新后仍会保留", () => {
    const firstStore = createTimetableStore({ storage })
    firstStore.getState().updateSettings({ theme: "system", showWeekends: true })
    firstStore.getState().updateSemester({ name: "验收学期", totalWeeks: 18, endDate: "2026-12-31" })
    firstStore.getState().updateSectionTime(1, { startTime: "08:10", endTime: "08:50" })

    const refreshedStore = createTimetableStore({ storage })
    expect(refreshedStore.getState().settings).toMatchObject({ theme: "system", showWeekends: true })
    expect(refreshedStore.getState().semester).toMatchObject({ name: "验收学期", totalWeeks: 18 })
    expect(refreshedStore.getState().sectionTimes[0]).toMatchObject({ startTime: "08:10", endTime: "08:50" })

    refreshedStore.getState().resetSectionTimes()
    expect(createTimetableStore({ storage }).getState().sectionTimes[0]).toMatchObject({ startTime: "08:00", endTime: "08:45" })
  })

  it("编辑课程后刷新仍保留修改", () => {
    const firstStore = createTimetableStore({ storage })
    firstStore.getState().addCourse(createCourse())
    firstStore.getState().updateCourse("course-1", { name: "视觉设计" })

    const refreshedStore = createTimetableStore({ storage })
    expect(refreshedStore.getState().courses[0].name).toBe("视觉设计")
  })

  it("自动配色的空 color 刷新后仍可恢复", () => {
    const firstStore = createTimetableStore({ storage })
    firstStore.getState().addCourse({ ...createCourse(), color: "" })

    expect(createTimetableStore({ storage }).getState().courses[0].color).toBe("")
  })

  it("删除课程后刷新不会恢复已删课程", () => {
    const firstStore = createTimetableStore({ storage })
    firstStore.getState().addCourse(createCourse())
    firstStore.getState().deleteCourse("course-1")

    expect(createTimetableStore({ storage }).getState().courses).toEqual([])
  })

  it("currentWeek 不持久化，刷新后回到运行时默认值", () => {
    const firstStore = createTimetableStore({ storage })
    firstStore.getState().setCurrentWeek(8)

    expect(storage.getItem(APP_STORAGE_KEY)).toBeNull()
    expect(createTimetableStore({ storage }).getState().currentWeek).toBe(1)
  })

  it("restoreAppData 完整替换长期数据并 clamp currentWeek", () => {
    const store = createTimetableStore({ storage })
    store.getState().addCourse(createCourse("old"))
    store.getState().setCurrentWeek(18)

    const restoredState = createDefaultPersistedState()
    restoredState.semester.totalWeeks = 8
    restoredState.semester.endDate = "2026-10-25"
    restoredState.courses = [createCourse("restored")]
    restoredState.todos = [createTodo("restored-todo")]
    restoredState.settings.theme = "dark"
    const preview = previewImportedAppData(exportAppData(restoredState))

    expect(store.getState().restoreAppData(preview)).toBe(true)
    expect(store.getState()).toMatchObject({
      courses: [createCourse("restored")],
      todos: [createTodo("restored-todo")],
      currentWeek: 8,
      settings: { theme: "dark" },
    })
    expect(createTimetableStore({ storage }).getState()).toMatchObject({
      courses: [createCourse("restored")],
      todos: [createTodo("restored-todo")],
      semester: restoredState.semester,
      sectionTimes: restoredState.sectionTimes,
      settings: { theme: "dark" },
    })
  })

  it("损坏恢复数据不能覆盖当前有效状态", () => {
    const store = createTimetableStore({ storage })
    store.getState().addCourse(createCourse())
    const coursesBeforeRestore = store.getState().courses

    expect(store.getState().restoreAppData(previewImportedAppData("{bad json"))).toBe(false)
    expect(store.getState().courses).toBe(coursesBeforeRestore)
  })

  it("未来版本存在时普通 action 不会覆盖原始存储", () => {
    const futureData = JSON.stringify({ schemaVersion: 99 })
    storage.setItem(APP_STORAGE_KEY, futureData)
    const store = createTimetableStore({ storage })
    store.getState().addCourse(createCourse())

    expect(storage.getItem(APP_STORAGE_KEY)).toBe(futureData)
  })

  it("恢复成功后可重新启用持久化", () => {
    const futureData = JSON.stringify({ schemaVersion: 99 })
    storage.setItem(APP_STORAGE_KEY, futureData)
    const store = createTimetableStore({ storage })
    const validState = createDefaultPersistedState()
    validState.settings.theme = "dark"

    expect(
      store
        .getState()
        .restoreAppData(previewImportedAppData(exportAppData(validState))),
    ).toBe(true)
    expect(createTimetableStore({ storage }).getState().settings.theme).toBe("dark")
  })

  it("可从 storage API 预存的数据初始化", () => {
    const state = createDefaultPersistedState()
    state.courses = [createCourse()]
    savePersistedState(state, storage)

    expect(createTimetableStore({ storage }).getState().courses).toEqual([createCourse()])
  })
})
