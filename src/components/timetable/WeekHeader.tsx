import { cn } from "@/lib/utils"
import type { WeekDayView } from "@/lib/timetableView"

interface WeekHeaderProps {
  days: readonly WeekDayView[]
}

export function WeekHeader({ days }: WeekHeaderProps) {
  return (
    <>
      <div className="z-10 flex items-center justify-center border-b bg-card text-[10px] font-semibold tracking-wide text-muted-foreground">
        节次
      </div>
      {days.map((day) => (
        <div
          key={day.dayOfWeek}
          aria-current={day.isToday ? "date" : undefined}
          aria-label={`${day.label} ${day.date}日${day.isToday ? "，今天" : ""}`}
          className={cn(
            "z-10 flex min-w-0 flex-col items-center justify-center border-b border-l bg-card px-0.5 text-center",
            day.isToday && "bg-primary/10",
          )}
        >
          <span
            className={cn(
              "truncate text-[10px] font-medium text-muted-foreground sm:text-[11px]",
              day.isToday && "font-semibold text-primary",
            )}
          >
            {day.label}
          </span>
          <span
            className={cn(
              "mt-0.5 flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-150",
              day.isToday ? "bg-primary text-primary-foreground" : "text-foreground",
            )}
          >
            {day.date}
          </span>
          {day.isToday ? <span className="sr-only">今天</span> : null}
        </div>
      ))}
    </>
  )
}
