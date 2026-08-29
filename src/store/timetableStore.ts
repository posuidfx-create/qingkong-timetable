import { useStore } from "zustand"
import { createStore, type StoreApi } from "zustand/vanilla"

import { DEFAULT_SECTION_TIMES } from "@/lib/defaults"
import {
  clonePersistedState,
  clearPersistedState,
  createDefaultPersistedState,
  CURRENT_SCHEMA_VERSION,
  isValidSectionTime,
  isValidSemester,
  loadPersistedState,
  migratePersistedState,
  savePersistedState,
  type ImportPreview,
  type PersistedAppState,
  type StorageAdapter,
} from "@/lib/storage"
import type {
  ApplicationSettings,
  Course,
  SectionNumber,
  SectionTime,
  Semester,
  Todo,
} from "@/types/timetable"

export type CourseUpdates = Partial<Omit<Course, "id">>
export type TodoUpdates = Partial<Omit<Todo, "id">>
export type SectionTimeUpdates = Partial<Omit<SectionTime, "section">>

export interface CourseImportSummary {
  added: number
  skipped: number
  conflictGroups?: number
}

export interface TimetableStoreState {
  courses: Course[]
  semester: Semester
  sectionTimes: SectionTime[]
  todos: Todo[]
  settings: ApplicationSettings
  currentWeek: number
}

export interface TimetableStoreActions {
  setCurrentWeek: (week: number) => void
  addCourse: (course: Course) => void
  updateCourse: (id: string, updates: CourseUpdates) => void
  deleteCourse: (id: string) => void
  importCourses: (courses: readonly Course[]) => CourseImportSummary
  clearCourses: () => void
  addTodo: (todo: Todo) => void
  updateTodo: (id: string, updates: TodoUpdates) => void
  deleteTodo: (id: string) => void
  toggleTodo: (id: string) => void
  updateSemester: (updates: Partial<Semester>) => boolean
  updateSectionTime: (
    section: SectionNumber,
    updates: SectionTimeUpdates,
  ) => boolean
  resetSectionTimes: () => void
  updateSettings: (updates: Partial<ApplicationSettings>) => void
  restoreAppData: (preview: ImportPreview) => boolean
  clearAppData: () => boolean
}

export type TimetableStore = TimetableStoreState & TimetableStoreActions

export interface CreateTimetableStoreOptions {
  storage?: StorageAdapter
}

function clampCurrentWeek(week: number, totalWeeks: number): number {
  if (!Number.isInteger(week)) return 1
  return Math.min(Math.max(week, 1), totalWeeks)
}

function toPersistedState(state: TimetableStoreState): PersistedAppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    courses: state.courses,
    semester: state.semester,
    sectionTimes: state.sectionTimes,
    todos: state.todos,
    settings: state.settings,
  }
}

function hasPersistentChanges(
  state: TimetableStore,
  previousState: TimetableStore,
): boolean {
  return (
    state.courses !== previousState.courses ||
    state.semester !== previousState.semester ||
    state.sectionTimes !== previousState.sectionTimes ||
    state.todos !== previousState.todos ||
    state.settings !== previousState.settings
  )
}

export function createTimetableStore(
  options: CreateTimetableStoreOptions = {},
): StoreApi<TimetableStore> {
  const loaded = loadPersistedState(options.storage)
  let persistenceAllowed = loaded.canPersist

  const store = createStore<TimetableStore>()((set, get) => ({
    courses: loaded.state.courses,
    semester: loaded.state.semester,
    sectionTimes: loaded.state.sectionTimes,
    todos: loaded.state.todos,
    settings: loaded.state.settings,
    currentWeek: 1,

    setCurrentWeek: (week) => {
      set({ currentWeek: clampCurrentWeek(week, get().semester.totalWeeks) })
    },

    addCourse: (course) => {
      set((state) => ({ courses: [...state.courses, course] }))
    },

    updateCourse: (id, updates) => {
      set((state) => ({
        courses: state.courses.map((course) =>
          course.id === id ? { ...course, ...updates, id: course.id } : course,
        ),
      }))
    },

    deleteCourse: (id) => {
      set((state) => ({ courses: state.courses.filter((course) => course.id !== id) }))
    },

    importCourses: (courses) => {
      const existingIds = new Set(get().courses.map((course) => course.id))
      const uniqueCourses: Course[] = []

      for (const course of courses) {
        if (existingIds.has(course.id)) continue
        existingIds.add(course.id)
        uniqueCourses.push(course)
      }

      if (uniqueCourses.length > 0) {
        set((state) => ({ courses: [...state.courses, ...uniqueCourses] }))
      }
      return { added: uniqueCourses.length, skipped: courses.length - uniqueCourses.length }
    },

    clearCourses: () => {
      set({ courses: [] })
    },

    addTodo: (todo) => {
      set((state) => ({ todos: [...state.todos, todo] }))
    },

    updateTodo: (id, updates) => {
      set((state) => ({
        todos: state.todos.map((todo) =>
          todo.id === id ? { ...todo, ...updates, id: todo.id } : todo,
        ),
      }))
    },

    deleteTodo: (id) => {
      set((state) => ({ todos: state.todos.filter((todo) => todo.id !== id) }))
    },

    toggleTodo: (id) => {
      set((state) => ({
        todos: state.todos.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo,
        ),
      }))
    },

    updateSemester: (updates) => {
      const semester = { ...get().semester, ...updates }
      if (!isValidSemester(semester)) return false

      set((state) => ({
        semester,
        currentWeek: clampCurrentWeek(state.currentWeek, semester.totalWeeks),
      }))
      return true
    },

    updateSectionTime: (section, updates) => {
      const current = get().sectionTimes.find((item) => item.section === section)
      if (!current) return false

      const updated = { ...current, ...updates, section: current.section }
      if (!isValidSectionTime(updated)) return false

      set((state) => ({
        sectionTimes: state.sectionTimes.map((item) =>
          item.section === section ? updated : item,
        ),
      }))
      return true
    },

    resetSectionTimes: () => {
      set({
        sectionTimes: DEFAULT_SECTION_TIMES.map((sectionTime) => ({ ...sectionTime })),
      })
    },

    updateSettings: (updates) => {
      set((state) => ({ settings: { ...state.settings, ...updates } }))
    },

    restoreAppData: (preview) => {
      if (!preview.valid || !preview.state) return false

      const migrated = migratePersistedState(preview.state)
      if (!migrated.state) return false

      const restored = clonePersistedState(migrated.state)
      persistenceAllowed = true
      set((state) => ({
        courses: restored.courses,
        semester: restored.semester,
        sectionTimes: restored.sectionTimes,
        todos: restored.todos,
        settings: restored.settings,
        currentWeek: clampCurrentWeek(state.currentWeek, restored.semester.totalWeeks),
      }))
      return true
    },

    clearAppData: () => {
      const cleared = clearPersistedState(options.storage)
      const defaults = createDefaultPersistedState()
      persistenceAllowed = cleared.success
      set({
        courses: defaults.courses,
        semester: defaults.semester,
        sectionTimes: defaults.sectionTimes,
        todos: defaults.todos,
        settings: defaults.settings,
        currentWeek: 1,
      })
      return cleared.success
    },
  }))

  store.subscribe((state, previousState) => {
    if (!persistenceAllowed || !hasPersistentChanges(state, previousState)) return
    savePersistedState(toPersistedState(state), options.storage)
  })

  return store
}

export const timetableStore = createTimetableStore()

export function useTimetableStore<T>(selector: (state: TimetableStore) => T): T {
  return useStore(timetableStore, selector)
}
