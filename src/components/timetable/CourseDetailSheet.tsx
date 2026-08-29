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
import type { Course, DayOfWeek, SectionTime } from "@/types/timetable"

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

const dayLabels: Record<DayOfWeek, string> = {
  1: "周一",
  2: "周二",
  3: "周三",
  4: "周四",
  5: "周五",
  6: "周六",
  7: "周日",
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
            课程详情
            {readOnly ? <span className="rounded-full bg-secondary px-2 py-0.5">内置课表</span> : null}
          </div>
          <SheetTitle className="mt-2 break-words text-xl font-semibold leading-7">
            {course?.name ?? "课程详情"}
          </SheetTitle>
          <SheetDescription>
            {readOnly ? "内置课表仅供查看；导入和手动新增的课程可继续编辑。" : "查看课程安排，或继续编辑课程。"}
          </SheetDescription>
        </SheetHeader>

        {course ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {course.teacher ? <DetailItem icon={UserRound} label="教师" value={course.teacher} /> : null}
              {course.academicAdvisor ? (
                <DetailItem icon={GraduationCap} label="学术导师" value={course.academicAdvisor} />
              ) : null}
              {course.classroom ? <DetailItem icon={MapPin} label="教室" value={course.classroom} /> : null}
              <DetailItem
                icon={Clock3}
                label="时间"
                value={`${dayLabels[course.dayOfWeek]} 第${course.startSection}-${course.endSection}节${timeLabel ? ` · ${timeLabel}` : ""}`}
              />
              <DetailItem icon={CalendarRange} label="周次" value={formatWeeks(course.weeks)} />
              {course.note ? <DetailItem icon={NotebookPen} label="备注" value={course.note} /> : null}
            </div>

            {conflicts.length > 0 ? (
              <section
                aria-labelledby="course-detail-conflicts"
                className="mt-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-3 text-amber-950 dark:text-amber-100"
              >
                <div className="flex items-center gap-2">
                  <TriangleAlert aria-hidden="true" className="size-4 text-amber-700 dark:text-amber-300" />
                  <h3 id="course-detail-conflicts" className="text-sm font-semibold">
                    时间冲突
                  </h3>
                </div>
                <ul className="mt-2 space-y-1 text-xs leading-5">
                  {conflicts.map((conflict) => {
                    const sectionText =
                      conflict.startSection === conflict.endSection
                        ? `第${conflict.startSection}节`
                        : `第${conflict.startSection}-${conflict.endSection}节`
                    return (
                      <li key={conflict.course.id}>
                        与“{conflict.course.name}”冲突 · {formatWeeks(conflict.overlappingWeeks)} · {sectionText}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            {readOnly ? (
              <p className="mt-3 rounded-2xl bg-primary/8 p-3 text-xs leading-5 text-primary">
                这是当前年级的内置课程。你可以点击右下角新增自己的课程。
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  onClick={() => onEdit(course)}
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  编辑课程
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-destructive/10 text-sm font-semibold text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                      删除课程
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>确定删除“{course.name}”吗？</AlertDialogTitle>
                      <AlertDialogDescription>删除后无法恢复。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="min-h-11">取消</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        className="min-h-11"
                        onClick={() => onDelete(course)}
                      >
                        删除
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
