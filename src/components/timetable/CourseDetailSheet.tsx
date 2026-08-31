import {
  BookOpenText,
  CalendarRange,
  Clock3,
  GraduationCap,
  MapPin,
  NotebookPen,
  Pencil,
  TriangleAlert,
  Trash2,
  UserRound,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { CourseConflictMatch } from "@/lib/conflict"
import { getCourseTimeLabel } from "@/lib/courseForm"
import { formatWeeks } from "@/lib/weekParser"
import type { Course, SectionTime } from "@/types/timetable"
import { useI18n } from "@/i18n/useI18n"
import { getLocalizedDayLabel } from "@/i18n/format"
import { formatTranslation } from "@/i18n/translate"

interface CourseDetailSheetProps {
  course?: Course
  conflicts?: readonly CourseConflictMatch[]
  readOnly?: boolean
  onDelete: (course: Course) => void
  onEdit: (course: Course) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  sectionTimes: readonly SectionTime[]
}

interface DetailItemProps {
  icon: typeof UserRound
  label: string
  value: string
}

function DetailItem({ icon: Icon, label, value }: DetailItemProps) {
  return (
    <div className="flex gap-3 rounded-2xl bg-muted/55 p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-xs">
        <Icon aria-hidden="true" className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium leading-5">{value}</p>
      </div>
    </div>
  )
}

export function CourseDetailSheet({
  course,
  conflicts = [],
  readOnly = false,
  onDelete,
  onEdit,
  onOpenChange,
  open,
  sectionTimes,
}: CourseDetailSheetProps) {
  const { locale, t } = useI18n()
  const timeLabel = course ? getCourseTimeLabel(course, sectionTimes) : undefined

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="responsive-bottom-sheet max-h-[88dvh] gap-0 overflow-hidden rounded-t-3xl border-x sm:bottom-4 sm:w-[min(32rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:rounded-3xl sm:border"
      >
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/25" />
        <SheetHeader className="pr-14 pb-3">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <BookOpenText aria-hidden="true" className="size-4" />
            {t("timetable.courseDetails")}
            {readOnly ? <span className="rounded-full bg-secondary px-2 py-0.5">{t("timetable.builtin")}</span> : null}
          </div>
          <SheetTitle className="mt-2 break-words text-xl font-semibold leading-7">
            {course?.name ?? t("timetable.courseDetails")}
          </SheetTitle>
          <SheetDescription>
            {t(readOnly ? "timetable.readOnlyDescription" : "timetable.detailDescription")}
          </SheetDescription>
        </SheetHeader>

        {course ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {course.teacher ? <DetailItem icon={UserRound} label={t("timetable.teacher")} value={course.teacher} /> : null}
              {course.academicAdvisor ? (
                <DetailItem icon={GraduationCap} label={t("timetable.advisor")} value={course.academicAdvisor} />
              ) : null}
              {course.classroom ? <DetailItem icon={MapPin} label={t("timetable.classroom")} value={course.classroom} /> : null}
              <DetailItem
                icon={Clock3}
                label={t("timetable.time")}
                value={`${getLocalizedDayLabel(course.dayOfWeek, locale)} · ${formatTranslation(t("timetable.sectionNumber"), { section: course.startSection === course.endSection ? course.startSection : `${course.startSection}–${course.endSection}` })}${timeLabel ? ` · ${timeLabel}` : ""}`}
              />
              <DetailItem icon={CalendarRange} label={t("timetable.weeks")} value={formatWeeks(course.weeks, locale)} />
              {course.note ? <DetailItem icon={NotebookPen} label={t("timetable.note")} value={course.note} /> : null}
            </div>

            {conflicts.length > 0 ? (
              <section
                aria-labelledby="course-detail-conflicts"
                className="mt-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-3 text-amber-950 dark:text-amber-100"
              >
                <div className="flex items-center gap-2">
                  <TriangleAlert aria-hidden="true" className="size-4 text-amber-700 dark:text-amber-300" />
                  <h3 id="course-detail-conflicts" className="text-sm font-semibold">
                    {t("timetable.conflict")}
                  </h3>
                </div>
                <ul className="mt-2 space-y-1 text-xs leading-5">
                  {conflicts.map((conflict) => {
                    const sectionText = formatTranslation(t("timetable.sectionNumber"), { section: conflict.startSection === conflict.endSection ? conflict.startSection : `${conflict.startSection}–${conflict.endSection}` })
                    return (
                      <li key={conflict.course.id}>
                        {formatTranslation(t("timetable.conflictWith"), { course: conflict.course.name })} · {formatWeeks(conflict.overlappingWeeks, locale)} · {sectionText}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            {readOnly ? (
              <p className="mt-3 rounded-2xl bg-primary/8 p-3 text-xs leading-5 text-primary">
                {t("timetable.builtinHint")}
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  onClick={() => onEdit(course)}
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  {t("timetable.editCourse")}
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-destructive/10 text-sm font-semibold text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                      {t("timetable.deleteCourse")}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("timetable.deleteTitle")} · {course.name}</AlertDialogTitle>
                      <AlertDialogDescription>{t("timetable.deleteDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="min-h-11">{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        className="min-h-11"
                        onClick={() => onDelete(course)}
                      >
                        {t("common.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
