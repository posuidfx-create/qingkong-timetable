import { useMemo, useRef, useState, type ChangeEvent } from "react"
import { Plus } from "lucide-react"

import { CourseDetailSheet } from "@/components/timetable/CourseDetailSheet"
import { CourseFormSheet } from "@/components/timetable/CourseFormSheet"
import { ImportPreviewSheet } from "@/components/timetable/ImportPreviewSheet"
import { TimetableGrid } from "@/components/timetable/TimetableGrid"
import { TimetableHeader } from "@/components/timetable/TimetableHeader"
import { TimetableWorkspaceAside } from "@/components/workspace/TimetableWorkspaceAside"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { getVisibleCourses, isBuiltinCourse, type CohortYear } from "@/data/builtinTimetables"
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
import { useI18n } from "@/i18n/useI18n"
import { formatTranslation } from "@/i18n/translate"

type ActiveOverlay =
  | { type: "detail"; course: Course; readOnly: boolean }
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
  onOpenLearning?: () => void
  onOpenTodos?: () => void
}

export function TimetablePage({ onOpenLearning, onOpenTodos }: TimetablePageProps) {
  const { locale, t } = useI18n()
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
  const [cohortPickerOpen, setCohortPickerOpen] = useState(() => settings.cohortYear === undefined)
  const [focusedWindow, setFocusedWindow] = useState<"main" | "today" | "learning" | "todo" | "ai">("main")
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
    locale,
  )
  const visibleCourses = useMemo(
    () => getVisibleCourses(settings.cohortYear, courses),
    [settings.cohortYear, courses],
  )
  const currentWeekCourses = getCoursesForWeek(visibleCourses, currentWeek)
  const todayTodoCount = getTodayTodos(todos, today).length

  function handleSave(savedCourse: Course) {
    if (activeOverlay?.type === "form" && activeOverlay.mode === "edit") {
      const { id, ...updates } = savedCourse
      updateCourse(id, updates)
    } else {
      addCourse(savedCourse)
    }
    setActiveOverlay(undefined)
  }

  function handleDelete(course: Course) {
    if (isBuiltinCourse(course)) return
    deleteCourse(course.id)
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
    <div className="timetable-page w-full max-w-[100rem]">
      <div className="timetable-workspace" data-focused-window={focusedWindow} onClick={(event) => {
        if (event.target === event.currentTarget) setFocusedWindow("main")
      }}>
      <section className="workspace-window timetable-main-window" data-focused={focusedWindow === "main" || undefined} onClick={() => setFocusedWindow("main")}>
      <TimetableHeader
        currentWeek={currentWeek}
        currentWeekTarget={currentWeekTarget}
        dateRange={formatSemesterWeekRange(semester, currentWeek, locale)}
        cohortYear={settings.cohortYear}
        semesterName={semester.name}
        totalWeeks={semester.totalWeeks}
        onImportExcel={() => fileInputRef.current?.click()}
        onCohortChange={(cohortYear) => {
          updateSettings({ cohortYear })
          setCohortPickerOpen(false)
        }}
        onGoToCurrentWeek={() => setCurrentWeek(currentWeekTarget)}
        onNextWeek={() => setCurrentWeek(currentWeek + 1)}
        onPreviousWeek={() => setCurrentWeek(currentWeek - 1)}
        onWeekChange={setCurrentWeek}
      />
      {todayTodoCount > 0 ? (
        <button
          type="button"
          className="timetable-todo-notice mx-3 mb-3 flex min-h-11 w-[calc(100%-1.5rem)] items-center justify-between border px-3 text-left text-sm sm:mx-4 sm:w-[calc(100%-2rem)]"
          onClick={onOpenTodos}
        >
          <span className="font-medium">{formatTranslation(t("timetable.todayTodos"), { count: todayTodoCount })}</span>
          <span className="text-xs text-primary">{t("timetable.view")}</span>
        </button>
      ) : null}
      <TimetableGrid
          courses={currentWeekCourses}
          days={days}
          onCourseSelect={(course) =>
          setActiveOverlay({ type: "detail", course, readOnly: isBuiltinCourse(course) })
        }
        sectionTimes={sectionTimes}
      />
      </section>
      <TimetableWorkspaceAside focusedWindow={focusedWindow} onFocus={setFocusedWindow} onOpenLearning={onOpenLearning} onOpenTodos={onOpenTodos} todayTodoCount={todayTodoCount} />
      </div>

      <input
        ref={fileInputRef}
        aria-label={t("timetable.chooseExcel")}
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="sr-only"
        type="file"
        onChange={handleFileChange}
      />

      <button
        type="button"
        aria-label={t("timetable.addCourse")}
        className="timetable-fab flex min-h-11 touch-manipulation items-center justify-center gap-2 bg-primary px-3 text-sm font-medium text-primary-foreground transition-transform duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() =>
          setActiveOverlay({ type: "form", mode: "create", key: getFormKey("create") })
        }
      >
        <Plus aria-hidden="true" className="size-5" strokeWidth={2} /><span className="hidden lg:inline">{t("timetable.addCourse")}</span>
      </button>

      {activeOverlay?.type === "detail" ? (
        <CourseDetailSheet
          course={activeOverlay.course}
          conflicts={getConflictsForCourse(visibleCourses, activeOverlay.course.id, currentWeek)}
          readOnly={activeOverlay.readOnly}
          open
          sectionTimes={sectionTimes}
              onDelete={handleDelete}
              onEdit={(course) =>
            !isBuiltinCourse(course) && setActiveOverlay({
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
          existingCourses={visibleCourses}
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
            const conflictGroups = getCourseConflicts([...getVisibleCourses(settings.cohortYear, courses), ...newlyImported]).filter(
              (conflict) =>
                newlyImported.some(
                  (course) => course.id === conflict.courseAId || course.id === conflict.courseBId,
                ),
            ).length
            const summary = { ...importCourses(result.courses), conflictGroups }
            setImportSession((current) => (current ? { ...current, summary } : current))
          }}
        />
      ) : null}
      <Sheet open={cohortPickerOpen} onOpenChange={setCohortPickerOpen}>
        <SheetContent side="bottom" className="responsive-bottom-sheet rounded-t-3xl">
          <SheetHeader><SheetTitle>{t("timetable.chooseCohort")}</SheetTitle><SheetDescription>{t("timetable.chooseCohortDescription")}</SheetDescription></SheetHeader>
          <div className="grid grid-cols-2 gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {([2024, 2025] as const).map((cohortYear: CohortYear) => <button key={cohortYear} type="button" className="min-h-12 rounded-2xl border bg-secondary/55 text-sm font-semibold text-secondary-foreground active:bg-primary/15 active:text-primary" onClick={() => { updateSettings({ cohortYear }); setCohortPickerOpen(false) }}>{String(cohortYear).slice(2)}{t("profile.cohortSuffix")}</button>)}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
