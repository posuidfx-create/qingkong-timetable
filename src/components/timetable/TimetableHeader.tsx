import { ChevronLeft, ChevronRight, FileUp, LocateFixed } from "lucide-react"

import { cn } from "@/lib/utils"

interface TimetableHeaderProps {
  semesterName: string
  currentWeek: number
  totalWeeks: number
  dateRange: string
  isDemo: boolean
  onGoToCurrentWeek: () => void
  onNextWeek: () => void
  onPreviousWeek: () => void
  onImportExcel: () => void
  currentWeekTarget: number
}

const iconButtonClassName =
  "flex size-11 touch-manipulation items-center justify-center rounded-[15px] border bg-card text-foreground shadow-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97] active:bg-muted disabled:pointer-events-none disabled:opacity-35"

export function TimetableHeader({
  semesterName,
  currentWeek,
  totalWeeks,
  dateRange,
  isDemo,
  onGoToCurrentWeek,
  onNextWeek,
  onPreviousWeek,
  onImportExcel,
  currentWeekTarget,
}: TimetableHeaderProps) {
  return (
    <section aria-labelledby="timetable-heading" className="px-3 pb-3 pt-4 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2
              id="timetable-heading"
              className="truncate text-sm font-semibold tracking-wide text-muted-foreground sm:text-base"
            >
              {semesterName}
            </h2>
            {isDemo ? (
              <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                示例
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="rounded-full bg-primary/12 px-2.5 py-1 text-sm font-semibold text-primary">第 {currentWeek} 周</p>
            <p className="text-xs text-muted-foreground">{dateRange}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="导入 Excel"
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

      <div className="mt-3 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2">
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
