import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  APP_STORAGE_KEY,
  clearPersistedState,
  createDefaultPersistedState,
  CURRENT_SCHEMA_VERSION,
  exportAppData,
  loadPersistedState,
  parsePersistedState,
  previewImportedAppData,
  savePersistedState,
} from "@/lib/storage"
import { MemoryStorage } from "@/test/memoryStorage"
import type { Course } from "@/types/timetable"

const realCourse: Course = {
  id: "environment-design",
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

describe("storage", () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  afterEach(() => {
    storage.clear()
  })

  it("无 localStorage 数据时返回独立的默认状态", () => {
    const first = loadPersistedState(storage)
    const second = loadPersistedState(storage)

    expect(first).toMatchObject({ restored: false, canPersist: true, warnings: [] })
    expect(first.state.courses).toEqual([])
    expect(first.state.todos).toEqual([])
    expect(first.state.semester.name).toBe("2026 秋季学期")
    expect(first.state.sectionTimes).toHaveLength(11)
    expect(first.state).not.toBe(second.state)
    expect(first.state.sectionTimes).not.toBe(second.state.sectionTimes)
  })

  it("读取当前版本数据", () => {
    const state = createDefaultPersistedState()
    state.courses.push(realCourse)
    storage.setItem(APP_STORAGE_KEY, JSON.stringify(state))

    expect(loadPersistedState(storage)).toMatchObject({
      restored: true,
      canPersist: true,
      state: { schemaVersion: CURRENT_SCHEMA_VERSION, courses: [realCourse] },
    })
  })

  it("坏 JSON 回退默认状态并报告 warning", () => {
    storage.setItem(APP_STORAGE_KEY, "{bad json")
    const result = loadPersistedState(storage)

    expect(result.restored).toBe(false)
    expect(result.state).toEqual(createDefaultPersistedState())
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "INVALID_JSON" }),
    )
  })

  it.each(["\"hello\"", "[]"])("拒绝非对象根节点 %s", (serialized) => {
    storage.setItem(APP_STORAGE_KEY, serialized)
    expect(loadPersistedState(storage).warnings).toContainEqual(
      expect.objectContaining({ code: "INVALID_ROOT" }),
    )
  })

  it("空对象缺少 schemaVersion", () => {
    storage.setItem(APP_STORAGE_KEY, "{}")
    expect(loadPersistedState(storage).warnings).toContainEqual(
      expect.objectContaining({ code: "MISSING_SCHEMA_VERSION" }),
    )
  })

  it("schemaVersion 缺失时拒绝加载", () => {
    const stateWithoutVersion = createDefaultPersistedState()
    const serialized = JSON.stringify({
      courses: stateWithoutVersion.courses,
      semester: stateWithoutVersion.semester,
      sectionTimes: stateWithoutVersion.sectionTimes,
      todos: stateWithoutVersion.todos,
      settings: stateWithoutVersion.settings,
    })

    expect(parsePersistedState(serialized).errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_SCHEMA_VERSION" }),
    )
  })

  it("缺少字段时整包回退而不是构造半有效状态", () => {
    storage.setItem(APP_STORAGE_KEY, JSON.stringify({ schemaVersion: 1 }))
    const result = loadPersistedState(storage)

    expect(result.restored).toBe(false)
    expect(result.state).toEqual(createDefaultPersistedState())
    expect(result.warnings.some((item) => item.code === "INVALID_STATE")).toBe(true)
  })

  it("部分字段类型错误时整包回退", () => {
    const state = { ...createDefaultPersistedState(), todos: "not-an-array" }
    storage.setItem(APP_STORAGE_KEY, JSON.stringify(state))

    const result = loadPersistedState(storage)
    expect(result.restored).toBe(false)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "INVALID_STATE", path: "todos" }),
    )
  })

  it("过早版本通过迁移入口安全拒绝", () => {
    storage.setItem(
      APP_STORAGE_KEY,
      JSON.stringify({ ...createDefaultPersistedState(), schemaVersion: 0 }),
    )
    const result = loadPersistedState(storage)

    expect(result.canPersist).toBe(false)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "UNSUPPORTED_SCHEMA_VERSION" }),
    )
  })

  it("schemaVersion 1 的旧待办会补全类型和创建时间", () => {
    const legacy = createDefaultPersistedState()
    legacy.todos = []
    storage.setItem(
      APP_STORAGE_KEY,
      JSON.stringify({
        ...legacy,
        schemaVersion: 1,
        todos: [{ id: "legacy-todo", title: "旧待办", completed: false }],
      }),
    )

    expect(loadPersistedState(storage).state.todos).toEqual([
      {
        id: "legacy-todo",
        title: "旧待办",
        completed: false,
        type: "other",
        createdAt: "1970-01-01T00:00:00.000Z",
      },
    ])
  })

  it("未来版本回退默认状态且禁止自动覆盖原文", () => {
    const futureData = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 })
    storage.setItem(APP_STORAGE_KEY, futureData)
    const result = loadPersistedState(storage)

    expect(result.restored).toBe(false)
    expect(result.canPersist).toBe(false)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "FUTURE_SCHEMA_VERSION" }),
    )
    expect(storage.getItem(APP_STORAGE_KEY)).toBe(futureData)
  })

  it("save 后可以重新读取", () => {
    const state = createDefaultPersistedState()
    state.settings.theme = "dark"

    expect(savePersistedState(state, storage)).toEqual({ success: true, warnings: [] })
    expect(loadPersistedState(storage).state.settings.theme).toBe("dark")
  })

  it("clear 后恢复默认状态", () => {
    const state = createDefaultPersistedState()
    state.todos.push({
      id: "todo-1",
      title: "复习",
      type: "other",
      completed: false,
      createdAt: "2026-08-31T08:00:00.000Z",
    })
    savePersistedState(state, storage)

    expect(clearPersistedState(storage)).toEqual({ success: true, warnings: [] })
    expect(loadPersistedState(storage).state).toEqual(createDefaultPersistedState())
  })

  it("完整保存 11 节作息和 academicAdvisor", () => {
    const state = createDefaultPersistedState()
    state.courses.push(realCourse)
    savePersistedState(state, storage)

    const restored = loadPersistedState(storage).state
    expect(restored.sectionTimes).toHaveLength(11)
    expect(restored.sectionTimes[10]).toEqual({
      section: 11,
      startTime: "19:50",
      endTime: "20:35",
    })
    expect(restored.courses[0].academicAdvisor).toBe("王词光")
  })

  it("JSON 导出可以生成有效恢复预览", () => {
    const state = createDefaultPersistedState()
    state.courses.push(realCourse)

    const preview = previewImportedAppData(exportAppData(state))
    expect(preview).toMatchObject({
      valid: true,
      warnings: [],
      errors: [],
      state: { courses: [realCourse] },
    })
  })

  it("损坏的 JSON 导入只生成无效预览", () => {
    expect(previewImportedAppData("{bad json")).toMatchObject({
      valid: false,
      warnings: [],
      errors: ["本地数据不是有效 JSON"],
    })
  })
})
