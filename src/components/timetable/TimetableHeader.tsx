import { CalendarDays, ChevronLeft, ChevronRight, FileUp, LocateFixed } from "lucide-react"

import type { CohortYear } from "@/data/builtinTimetables"
import { cn } from "@/lib/utils"

interface TimetableHeaderProps {
  semesterName: string
  currentWeek: number
  totalWeeks: number
  dateRange: string
  cohortYear?: CohortYear
  onGoToCurrentWeek: () => void
  onNextWeek: () => void
  onPreviousWeek: () => void
  onImportExcel: () => void
  currentWeekTarget: number
  onCohortChange: (cohortYear: CohortYear) => void
}

const iconButtonClassName =
  "flex size-11 touch-manipulation items-center justify-center rounded-[15px] border bg-card text-foreground shadow-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97] active:bg-muted disabled:pointer-events-none disabled:opacity-35"

export function TimetableHeader({
  semesterName,
  currentWeek,
  totalWeeks,
  dateRange,
  cohortYear,
  onGoToCurrentWeek,
  onNextWeek,
  onPreviousWeek,
  onImportExcel,
  currentWeekTarget,
  onCohortChange,
}: TimetableHeaderProps) {
  return (
    <section aria-labelledby="timetable-heading" className="px-3 pb-3 pt-4 sm:px-5 lg:px-6 lg:pb-4">
      <div className="flex items-start justify-between gap-3 lg:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <div><h2 id="timetable-heading" className="flex items-center gap-1.5 text-base font-semibold tracking-tight"><CalendarDays className="size-4 text-primary" />晴空课表</h2><p className="mt-0.5 truncate text-[11px] text-muted-foreground">国际教育学院 · 中外合作办学 · {semesterName}</p></div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 lg:mt-1.5">
            <p className="rounded-full bg-primary/12 px-2.5 py-1 text-sm font-semibold text-primary">第 {currentWeek} 周</p>
            <p className="text-xs text-muted-foreground">{dateRange}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="导入自定义课表"
            className={iconButtonClassName}
            onClick={onImportExcel}
          >
            <FileUp aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            className={cn(
              "flex min-h-11 touch-manipulation items-center gap-1.5 rounded-[15px] bg-secondary px-3 text-xs font-semibold text-secondary-foreground transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
            )}
            disabled={currentWeek === currentWeekTarget}
            onClick={onGoToCurrentWeek}
          >
            <LocateFixed aria-hidden="true" className="size-4" />
            本周
          </button>
        </div>
      </div>

      <div className="mt-3 lg:flex lg:items-center lg:justify-between lg:gap-4"><div><p className="mb-1.5 text-xs font-medium text-muted-foreground">查看课表</p><div className="inline-flex rounded-xl border bg-card p-1 shadow-xs" aria-label="查看课表年级">
        {([2024, 2025] as const).map((year) => (
          <button
            key={year}
            type="button"
            aria-pressed={cohortYear === year}
            className={cn(
              "min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              cohortYear === year ? year === 2024 ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200" : "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200" : "text-muted-foreground active:bg-muted",
            )}
            onClick={() => onCohortChange(year)}
          >
            {String(year).slice(2)}级
          </button>
        ))}
      </div></div><p className="mt-3 hidden text-sm text-muted-foreground lg:block">共 {totalWeeks} 周 · 使用左右按钮切换教学周</p></div>

      <div className="mt-3 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 lg:mt-4 lg:max-w-md">
        <button
          type="button"
          aria-label="查看上一周"
          className={iconButtonClassName}
          disabled={currentWeek <= 1}
          onClick={onPreviousWeek}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>

        <p className="text-center text-xs text-muted-foreground">
          共 {totalWeeks} 周 · 左右切换教学周
        </p>

        <button
          type="button"
          aria-label="查看下一周"
          className={iconButtonClassName}
          disabled={currentWeek >= totalWeeks}
          onClick={onNextWeek}
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      </div>
    </section>
  )
}
