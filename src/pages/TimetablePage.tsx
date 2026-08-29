import { useMemo, useRef, useState, type ChangeEvent } from "react"
import { Plus } from "lucide-react"

import { CourseDetailSheet } from "@/components/timetable/CourseDetailSheet"
import { CourseFormSheet } from "@/components/timetable/CourseFormSheet"
import { ImportPreviewSheet } from "@/components/timetable/ImportPreviewSheet"
import { TimetableGrid } from "@/components/timetable/TimetableGrid"
import { TimetableHeader } from "@/components/timetable/TimetableHeader"
import { DEMO_COURSES } from "@/lib/demoCourses"
import { getConflictsForCourse, getCourseConflicts } from "@/lib/conflict"
import { getCurrentSemesterWeek } from "@/lib/date"
import { getCoursesForWeek } from "@/lib/timetable"
import { getTodayTodos } from "@/lib/todo"
import {
  clampWeekToSemester,
  formatSemesterWeekRange,
  getWeekDayViews,
} from "@/lib/timetableView"
import { useTimetableStore } from "@/store/timetableStore"
import type { CourseImportSummary } from "@/store/timetableStore"
import type { WorkbookImportResult } from "@/types/importTimetable"
import type { Course } from "@/types/timetable"

type ActiveOverlay =
  | { type: "detail"; course: Course; isDemo: boolean }
  | { type: "form"; mode: "create"; key: string }
  | { type: "form"; mode: "edit"; course: Course; key: string }

interface ImportSession {
  workbook: WorkbookImportResult
  selectedTimetableId?: string
  summary?: CourseImportSummary
}

let formSession = 0

function getFormKey(mode: "create" | "edit", courseId?: string): string {
  formSession += 1
  return `${mode}-${courseId ?? "new"}-${formSession}`
}

interface TimetablePageProps {
  onOpenTodos?: () => void
}

export function TimetablePage({ onOpenTodos }: TimetablePageProps) {
  const courses = useTimetableStore((state) => state.courses)
  const todos = useTimetableStore((state) => state.todos)
  const semester = useTimetableStore((state) => state.semester)
  const sectionTimes = useTimetableStore((state) => state.sectionTimes)
  const settings = useTimetableStore((state) => state.settings)
  const showWeekends = useTimetableStore((state) => state.settings.showWeekends)
  const currentWeek = useTimetableStore((state) => state.currentWeek)
  const setCurrentWeek = useTimetableStore((state) => state.setCurrentWeek)
  const addCourse = useTimetableStore((state) => state.addCourse)
  const updateCourse = useTimetableStore((state) => state.updateCourse)
  const deleteCourse = useTimetableStore((state) => state.deleteCourse)
  const importCourses = useTimetableStore((state) => state.importCourses)
  const updateSettings = useTimetableStore((state) => state.updateSettings)
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>()
  const [importSession, setImportSession] = useState<ImportSession>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const today = useMemo(() => new Date(), [])
  const actualSemesterWeek = getCurrentSemesterWeek(semester, today)
  const currentWeekTarget = clampWeekToSemester(
    actualSemesterWeek,
    semester.totalWeeks,
  )
  const isViewingActualWeek =
    actualSemesterWeek >= 1 &&
    actualSemesterWeek <= semester.totalWeeks &&
    currentWeek === actualSemesterWeek
  const days = getWeekDayViews(
    semester,
    currentWeek,
    showWeekends,
    isViewingActualWeek ? today : undefined,
  )
  const isDemo = courses.length === 0 && settings.showDemoCourses !== false
  const displayCourses = isDemo ? DEMO_COURSES : courses
  const currentWeekCourses = getCoursesForWeek(displayCourses, currentWeek)
  const todayTodoCount = getTodayTodos(todos, today).length

  function handleSave(savedCourse: Course) {
    if (activeOverlay?.type === "form" && activeOverlay.mode === "edit") {
      const { id, ...updates } = savedCourse
      updateCourse(id, updates)
    } else {
      updateSettings({ showDemoCourses: false })
      addCourse(savedCourse)
    }
    setActiveOverlay(undefined)
  }

  function handleDelete(course: Course) {
    deleteCourse(course.id)
    updateSettings({ showDemoCourses: false })
    setActiveOverlay(undefined)
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) return

    setActiveOverlay(undefined)
    let workbook: WorkbookImportResult
    try {
      const data = await file.arrayBuffer()
      const { parseWorkbook } = await import("@/lib/importTimetable")
      workbook = parseWorkbook(data, {
        sourceFileName: file.name,
        totalWeeks: semester.totalWeeks,
      })
    } catch {
      const { parseWorkbook } = await import("@/lib/importTimetable")
      workbook = parseWorkbook(new Uint8Array(), {
        sourceFileName: file.name,
        totalWeeks: semester.totalWeeks,
      })
    }
    setImportSession({ workbook })
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <TimetableHeader
        currentWeek={currentWeek}
        currentWeekTarget={currentWeekTarget}
        dateRange={formatSemesterWeekRange(semester, currentWeek)}
        isDemo={isDemo}
        semesterName={semester.name}
        totalWeeks={semester.totalWeeks}
        onImportExcel={() => fileInputRef.current?.click()}
        onGoToCurrentWeek={() => setCurrentWeek(currentWeekTarget)}
        onNextWeek={() => setCurrentWeek(currentWeek + 1)}
        onPreviousWeek={() => setCurrentWeek(currentWeek - 1)}
      />
      {todayTodoCount > 0 ? (
        <button
          type="button"
          className="mx-3 mb-3 flex min-h-11 w-[calc(100%-1.5rem)] items-center justify-between rounded-2xl border bg-card px-3 text-left text-sm shadow-xs sm:mx-4 sm:w-[calc(100%-2rem)]"
          onClick={onOpenTodos}
        >
          <span className="font-medium">今天还有 {todayTodoCount} 个待办</span>
          <span className="text-xs text-primary">查看</span>
        </button>
      ) : null}
      <TimetableGrid
        courses={currentWeekCourses}
        days={days}
        onCourseSelect={(course) =>
          setActiveOverlay({ type: "detail", course, isDemo })
        }
        sectionTimes={sectionTimes}
      />

      <input
        ref={fileInputRef}
        aria-label="选择 Excel 课程表文件"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="sr-only"
        type="file"
        onChange={handleFileChange}
      />

      <button
        type="button"
        aria-label="新增课程"
        className="timetable-fab flex size-14 touch-manipulation items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() =>
          setActiveOverlay({ type: "form", mode: "create", key: getFormKey("create") })
        }
      >
        <Plus aria-hidden="true" className="size-6" strokeWidth={2.4} />
      </button>

      {activeOverlay?.type === "detail" ? (
        <CourseDetailSheet
          course={activeOverlay.course}
          conflicts={getConflictsForCourse(courses, activeOverlay.course.id, currentWeek)}
          isDemo={activeOverlay.isDemo}
          open
          sectionTimes={sectionTimes}
          onDelete={handleDelete}
          onEdit={(course) =>
            setActiveOverlay({
              type: "form",
              mode: "edit",
              course,
              key: getFormKey("edit", course.id),
            })
          }
          onOpenChange={(open) => {
            if (!open) setActiveOverlay(undefined)
          }}
        />
      ) : null}

      {activeOverlay?.type === "form" ? (
        <CourseFormSheet
          key={activeOverlay.key}
          course={activeOverlay.mode === "edit" ? activeOverlay.course : undefined}
          existingCourses={courses}
          mode={activeOverlay.mode}
          open
          sectionTimes={sectionTimes}
          totalWeeks={semester.totalWeeks}
          onOpenChange={(open) => {
            if (!open) setActiveOverlay(undefined)
          }}
          onSave={handleSave}
        />
      ) : null}

      {importSession ? (
        <ImportPreviewSheet
          open
          selectedTimetableId={importSession.selectedTimetableId}
          summary={importSession.summary}
          workbook={importSession.workbook}
          onCancel={() => setImportSession(undefined)}
          onSelectTimetable={(selectedTimetableId) =>
            setImportSession((current) =>
              current ? { ...current, selectedTimetableId, summary: undefined } : current,
            )
          }
          onConfirm={(result) => {
            const existingIds = new Set(courses.map((course) => course.id))
            const newlyImported = result.courses.filter((course) => !existingIds.has(course.id))
            const conflictGroups = getCourseConflicts([...courses, ...newlyImported]).filter(
              (conflict) =>
                newlyImported.some(
                  (course) => course.id === conflict.courseAId || course.id === conflict.courseBId,
                ),
            ).length
            const summary = { ...importCourses(result.courses), conflictGroups }
            if (summary.added > 0) updateSettings({ showDemoCourses: false })
            setImportSession((current) => (current ? { ...current, summary } : current))
          }}
        />
      ) : null}
    </div>
  )
}
