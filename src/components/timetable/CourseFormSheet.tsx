import { useState, type FormEvent } from "react"
import { Check, Clock3, Palette } from "lucide-react"

import { CourseConflictWarning } from "@/components/timetable/CourseConflictWarning"
import { WeekSelector } from "@/components/timetable/WeekSelector"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { CourseConflictMatch } from "@/lib/conflict"
import {
  createCourseFormValues,
  findCourseConflictMatches,
  getCourseTimeLabel,
  validateCourseForm,
  type CourseFormErrors,
  type CourseFormValues,
} from "@/lib/courseForm"
import { createUniqueId } from "@/lib/id"
import { COURSE_COLOR_PALETTE } from "@/lib/timetableView"
import { cn } from "@/lib/utils"
import type { Course, DayOfWeek, SectionTime } from "@/types/timetable"

export type CourseFormMode = "create" | "edit"

interface CourseFormSheetProps {
  course?: Course
  existingCourses: readonly Course[]
  mode: CourseFormMode
  onOpenChange: (open: boolean) => void
  onSave: (course: Course) => void
  open: boolean
  sectionTimes: readonly SectionTime[]
  totalWeeks: number
}

const dayOptions: readonly { value: DayOfWeek; label: string }[] = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 7, label: "周日" },
]

interface FieldErrorProps {
  id: string
  message?: string
}

function FieldError({ id, message }: FieldErrorProps) {
  return message ? (
    <p id={id} className="mt-1.5 text-xs text-destructive">
      {message}
    </p>
  ) : null
}

export function CourseFormSheet({
  course,
  existingCourses,
  mode,
  onOpenChange,
  onSave,
  open,
  sectionTimes,
  totalWeeks,
}: CourseFormSheetProps) {
  const [values, setValues] = useState(() => createCourseFormValues(course, totalWeeks))
  const [errors, setErrors] = useState<CourseFormErrors>({})
  const [pendingCourse, setPendingCourse] = useState<Course>()
  const [conflicts, setConflicts] = useState<CourseConflictMatch[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateValues(updates: Partial<CourseFormValues>) {
    setValues((current) => ({ ...current, ...updates }))
    setErrors({})
    setConflicts([])
    setPendingCourse(undefined)
  }

  function commit(courseToSave: Course) {
    if (isSubmitting) return
    setIsSubmitting(true)
    onSave(courseToSave)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const validation = validateCourseForm(values, totalWeeks)
    setErrors(validation.errors)
    if (!validation.valid || !validation.draft) return

    const candidate: Course = {
      id: course?.id ?? createUniqueId(),
      ...validation.draft,
    }
    const nextConflicts = findCourseConflictMatches(
      candidate,
      existingCourses,
      mode === "edit" ? course?.id : undefined,
    )

    if (nextConflicts.length > 0) {
      setPendingCourse(candidate)
      setConflicts(nextConflicts)
      return
    }

    commit(candidate)
  }

  const endSectionOptions = sectionTimes.filter(
    (sectionTime) => sectionTime.section >= values.startSection,
  )
  const timePreview = getCourseTimeLabel(values, sectionTimes)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="responsive-bottom-sheet max-h-[92dvh] gap-0 overflow-hidden rounded-t-3xl border-x sm:bottom-4 sm:w-[min(34rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:rounded-3xl sm:border"
      >
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/25" />
        <SheetHeader className="pr-14 pb-3">
          <SheetTitle className="text-xl font-semibold">
            {mode === "create" ? "新增课程" : "编辑课程"}
          </SheetTitle>
          <SheetDescription>
            {mode === "create" ? "填写课程安排，保存后会同步到本地。" : "修改后将立即更新课程表。"}
          </SheetDescription>
        </SheetHeader>

        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-5">
            <div>
              <Label htmlFor="course-name">课程名称 *</Label>
              <Input
                id="course-name"
                autoFocus
                aria-describedby={errors.name ? "course-name-error" : undefined}
                aria-invalid={Boolean(errors.name)}
                className="mt-2 h-11"
                maxLength={100}
                placeholder="例如：综合日语（三）"
                value={values.name}
                onChange={(event) => updateValues({ name: event.target.value })}
              />
              <FieldError id="course-name-error" message={errors.name} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>星期 *</Label>
                <Select
                  value={String(values.dayOfWeek)}
                  onValueChange={(nextValue) => {
                    const selected = dayOptions.find((day) => String(day.value) === nextValue)
                    if (selected) updateValues({ dayOfWeek: selected.value })
                  }}
                >
                  <SelectTrigger aria-label="星期" className="mt-2 h-11 w-full" aria-invalid={Boolean(errors.dayOfWeek)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {dayOptions.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)} className="min-h-10">
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl bg-muted/55 px-3 py-2">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 aria-hidden="true" className="size-3.5" />
                  时间预览
                </p>
                <p className="mt-1.5 text-sm font-semibold tabular-nums">{timePreview ?? "时间待设置"}</p>
              </div>
            </div>
            <FieldError id="course-day-error" message={errors.dayOfWeek} />

            <div>
              <Label>上课节次 *</Label>
              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Select
                  value={String(values.startSection)}
                  onValueChange={(nextValue) => {
                    const selected = sectionTimes.find(
                      (item) => String(item.section) === nextValue,
                    )?.section
                    if (selected) {
                      const endSection =
                        sectionTimes.find(
                          (item) => item.section === Math.max(selected, values.endSection),
                        )?.section ?? selected
                      updateValues({
                        startSection: selected,
                        endSection,
                      })
                    }
                  }}
                >
                  <SelectTrigger aria-label="开始节次" className="h-11 w-full" aria-invalid={Boolean(errors.sections)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {sectionTimes.map((item) => (
                      <SelectItem key={item.section} value={String(item.section)} className="min-h-10">
                        第 {item.section} 节
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">至</span>
                <Select
                  value={String(values.endSection)}
                  onValueChange={(nextValue) => {
                    const selected = endSectionOptions.find(
                      (item) => String(item.section) === nextValue,
                    )?.section
                    if (selected) updateValues({ endSection: selected })
                  }}
                >
                  <SelectTrigger aria-label="结束节次" className="h-11 w-full" aria-invalid={Boolean(errors.sections)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {endSectionOptions.map((item) => (
                      <SelectItem key={item.section} value={String(item.section)} className="min-h-10">
                        第 {item.section} 节
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FieldError id="course-sections-error" message={errors.sections} />
            </div>

            <WeekSelector
              error={errors.weeks}
              maxWeek={totalWeeks}
              value={values}
              onChange={updateValues}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="course-teacher">教师</Label>
                <Input
                  id="course-teacher"
                  className="mt-2 h-11"
                  maxLength={80}
                  value={values.teacher}
                  onChange={(event) => updateValues({ teacher: event.target.value })}
                />
                <FieldError id="course-teacher-error" message={errors.teacher} />
              </div>
              <div>
                <Label htmlFor="course-advisor">学术导师</Label>
                <Input
                  id="course-advisor"
                  className="mt-2 h-11"
                  maxLength={80}
                  value={values.academicAdvisor}
                  onChange={(event) => updateValues({ academicAdvisor: event.target.value })}
                />
                <FieldError id="course-advisor-error" message={errors.academicAdvisor} />
              </div>
              <div>
                <Label htmlFor="course-classroom">教室</Label>
                <Input
                  id="course-classroom"
                  className="mt-2 h-11"
                  maxLength={80}
                  placeholder="例如：A7-322"
                  value={values.classroom}
                  onChange={(event) => updateValues({ classroom: event.target.value })}
                />
                <FieldError id="course-classroom-error" message={errors.classroom} />
              </div>
            </div>

            <fieldset>
              <legend className="flex items-center gap-2 text-sm font-medium">
                <Palette aria-hidden="true" className="size-4 text-muted-foreground" />
                课程颜色
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-label="自动分配课程颜色"
                  aria-pressed={values.color === ""}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full border bg-muted text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    values.color === "" && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                  onClick={() => updateValues({ color: "" })}
                >
                  自动
                </button>
                {COURSE_COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`选择课程颜色 ${color}`}
                    aria-pressed={values.color === color}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-full border border-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      values.color === color && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => updateValues({ color })}
                  >
                    {values.color === color ? <Check aria-hidden="true" className="size-5 text-white drop-shadow-sm" /> : null}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <Label htmlFor="course-note">备注</Label>
              <Textarea
                id="course-note"
                aria-invalid={Boolean(errors.note)}
                className="mt-2"
                maxLength={500}
                placeholder="记录课程要求或其他信息"
                value={values.note}
                onChange={(event) => updateValues({ note: event.target.value })}
              />
              <FieldError id="course-note-error" message={errors.note} />
            </div>

            {conflicts.length > 0 && pendingCourse ? (
              <CourseConflictWarning
                conflicts={conflicts}
                disabled={isSubmitting}
                onCancel={() => {
                  setConflicts([])
                  setPendingCourse(undefined)
                }}
                onConfirm={() => commit(pendingCourse)}
              />
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t bg-popover px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              className="min-h-11 rounded-xl border bg-background text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              onClick={() => onOpenChange(false)}
            >
              取消
            </button>
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {mode === "create" ? "保存课程" : "保存修改"}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
