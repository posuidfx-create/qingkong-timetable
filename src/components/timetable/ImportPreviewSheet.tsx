import { AlertTriangle, CheckCircle2, FileSpreadsheet, MapPin, UserRound } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatWeeks } from "@/lib/weekParser"
import type { CourseImportSummary } from "@/store/timetableStore"
import type { ImportResult, WorkbookImportResult } from "@/types/importTimetable"
import { useI18n } from "@/i18n/useI18n"
import { getLocalizedDayLabel } from "@/i18n/format"
import { formatTranslation } from "@/i18n/translate"

interface ImportPreviewSheetProps {
  onCancel: () => void
  onConfirm: (result: ImportResult) => void
  onSelectTimetable: (id: string) => void
  open: boolean
  selectedTimetableId?: string
  summary?: CourseImportSummary
  workbook: WorkbookImportResult
}

function getResult(
  workbook: WorkbookImportResult,
  selectedTimetableId: string | undefined,
): ImportResult | undefined {
  return selectedTimetableId ? workbook.results[selectedTimetableId] : undefined
}

function hasFatalWarning(workbook: WorkbookImportResult): boolean {
  return workbook.warnings.some((warning) => warning.severity === "error")
}

export function ImportPreviewSheet({
  onCancel,
  onConfirm,
  onSelectTimetable,
  open,
  selectedTimetableId,
  summary,
  workbook,
}: ImportPreviewSheetProps) {
  const { locale, t } = useI18n()
  const result = getResult(workbook, selectedTimetableId)
  const fatal = hasFatalWarning(workbook)
  const warnings = [...workbook.warnings, ...(result?.warnings ?? [])]

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <SheetContent
        side="bottom"
        className="responsive-bottom-sheet max-h-[92dvh] gap-0 overflow-hidden rounded-t-3xl border-x sm:bottom-4 sm:w-[min(34rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:rounded-3xl sm:border"
      >
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/25" />
        <SheetHeader className="pr-14 pb-3">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <FileSpreadsheet aria-hidden="true" className="size-4" />
            {t("timetable.importLocal")}
          </div>
          <SheetTitle className="mt-2 text-xl font-semibold">{t("timetable.importTitle")}</SheetTitle>
          <SheetDescription>
            {workbook.metadata.sourceFileName ?? t("timetable.importSelected")} · {t("timetable.importPrivate")}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {fatal ? (
            <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-semibold">{t("timetable.importFailed")}</p>
              <p className="mt-1 text-xs leading-5">
                {workbook.warnings.find((warning) => warning.severity === "error")?.message}
              </p>
            </div>
          ) : (
            <>
              <section aria-labelledby="timetable-choice" className="rounded-2xl bg-muted/55 p-3">
                <h3 id="timetable-choice" className="text-sm font-semibold">{t("timetable.chooseSheet")}</h3>
                <div className="mt-2 grid gap-2">
                  {workbook.availableTimetables.map((timetable) => {
                    const selected = timetable.id === selectedTimetableId
                    return (
                      <button
                        key={timetable.id}
                        type="button"
                        aria-pressed={selected}
                        className={`min-h-11 rounded-xl border px-3 py-2 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-foreground active:bg-muted"
                        }`}
                        onClick={() => onSelectTimetable(timetable.id)}
                      >
                        <span className="block text-sm font-semibold">{timetable.label}</span>
                        {timetable.className ? (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {timetable.className}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </section>

              {result ? (
                <section className="mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{t("timetable.importPreview")}</h3>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatTranslation(t("timetable.importCounts"), { names: result.metadata.uniqueCourseNames, items: result.metadata.parsedCourseItems })}
                    </span>
                  </div>
                  <div className="mt-2 rounded-2xl border bg-card p-2">
                    {result.courses.slice(0, 6).map((course) => (
                      <div key={course.id} className="border-b px-2 py-2.5 last:border-b-0">
                        <p className="truncate text-sm font-semibold">{course.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getLocalizedDayLabel(course.dayOfWeek, locale)} · {formatTranslation(t("timetable.sectionNumber"), { section: course.startSection === course.endSection ? course.startSection : `${course.startSection}–${course.endSection}` })} · {formatWeeks(course.weeks, locale)}
                        </p>
                        <p className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                          {course.teacher ? <UserRound aria-hidden="true" className="size-3.5 shrink-0" /> : null}
                          <span className="truncate">{course.teacher ?? t("timetable.unrecognizedTeacher")}</span>
                          {course.classroom ? <MapPin aria-hidden="true" className="ml-1 size-3.5 shrink-0" /> : null}
                          <span className="truncate">{course.classroom ?? t("timetable.unrecognizedClassroom")}</span>
                        </p>
                      </div>
                    ))}
                    {result.courses.length > 6 ? (
                      <p className="px-2 pt-2 text-center text-xs text-muted-foreground">
                        {formatTranslation(t("timetable.moreItems"), { count: result.courses.length - 6 })}
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : (
                <p className="mt-4 rounded-2xl bg-muted/55 p-3 text-sm text-muted-foreground">
                  {t("timetable.previewChoose")}
                </p>
              )}

              {warnings.length > 0 ? (
                <section className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
                    <AlertTriangle aria-hidden="true" className="size-4 text-amber-700 dark:text-amber-300" />
                    {formatTranslation(t("timetable.warningCount"), { count: warnings.length })}
                  </div>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-900/85 dark:text-amber-100/85">
                    {warnings.slice(0, 3).map((warning, index) => (
                      <li key={`${warning.code}-${warning.cell ?? index}`}>{warning.message}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t bg-popover px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className="min-h-11 rounded-xl border bg-background text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            onClick={onCancel}
          >
            {t(summary ? "common.done" : "common.cancel")}
          </button>
          {summary ? (
            <div className="flex min-h-11 flex-col items-center justify-center rounded-xl bg-primary/10 px-2 text-center text-xs font-semibold text-primary">
              <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
              <span>{formatTranslation(t("timetable.importSummary"), { added: summary.added, skipped: summary.skipped })}</span>
              {summary.conflictGroups ? <span>{formatTranslation(t("timetable.conflictGroups"), { count: summary.conflictGroups })}</span> : null}
            </div>
          ) : (
            <button
              type="button"
              disabled={!result || fatal}
              className="min-h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-45"
              onClick={() => result && onConfirm(result)}
            >
              {t("timetable.importConfirm")}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
