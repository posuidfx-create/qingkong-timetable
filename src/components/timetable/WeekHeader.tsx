import { cn } from "@/lib/utils"
import type { WeekDayView } from "@/lib/timetableView"
import { useI18n } from "@/i18n/useI18n"

interface WeekHeaderProps {
  days: readonly WeekDayView[]
}

export function WeekHeader({ days }: WeekHeaderProps) {
  const { t } = useI18n()
  return (
    <>
      <div className="timetable-section-heading z-10 flex items-center justify-center border-b text-[10px] font-medium tracking-[0.12em] text-muted-foreground">
        TIME
      </div>
      {days.map((day) => (
        <div
          key={day.dayOfWeek}
          aria-current={day.isToday ? "date" : undefined}
          aria-label={`${day.label} ${day.date}${day.isToday ? `，${t("timetable.today")}` : ""}`}
          className={cn(
            "timetable-day-heading z-10 flex min-w-0 flex-col items-center justify-center border-b border-l px-0.5 text-center",
            day.isToday && "is-today",
          )}
        >
          <span
            className={cn(
              "truncate text-[10px] font-medium tracking-[0.08em] text-muted-foreground sm:text-[11px]",
              day.isToday && "text-primary",
            )}
          >
            {day.label}
          </span>
          <span
            className={cn(
              "timetable-day-date mt-1 flex min-w-6 items-center justify-center px-1 text-sm font-medium tabular-nums transition-colors duration-150",
              day.isToday ? "text-primary" : "text-foreground",
            )}
          >
            {day.date}
          </span>
          {day.isToday ? <span className="sr-only">{t("timetable.today")}</span> : null}
        </div>
      ))}
    </>
  )
}
