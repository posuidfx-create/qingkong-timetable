import type { CSSProperties } from "react"
import { CalendarOff } from "lucide-react"

import { CourseCard } from "@/components/timetable/CourseCard"
import { SectionColumn } from "@/components/timetable/SectionColumn"
import { WeekHeader } from "@/components/timetable/WeekHeader"
import { getCourseLayouts, type WeekDayView } from "@/lib/timetableView"
import type { Course, SectionTime } from "@/types/timetable"
import { useI18n } from "@/i18n/useI18n"

interface TimetableGridProps {
  courses: readonly Course[]
  days: readonly WeekDayView[]
  sectionTimes: readonly SectionTime[]
  onCourseSelect?: (course: Course) => void
}

interface TimetableGridStyle extends CSSProperties {
  "--timetable-visible-sections"?: string
}

function getGridStyle(dayCount: number, sectionCount: number): TimetableGridStyle {
  return {
    gridTemplateColumns: `2.85rem repeat(${dayCount}, minmax(0, 1fr))`,
    "--timetable-visible-sections": String(sectionCount),
  }
}

function getHeaderGridStyle(dayCount: number): CSSProperties {
  return {
    gridTemplateColumns: `2.85rem repeat(${dayCount}, minmax(0, 1fr))`,
    gridTemplateRows: "3.5rem",
  }
}

export function TimetableGrid({ courses, days, onCourseSelect, sectionTimes }: TimetableGridProps) {
  const { t } = useI18n()
  if (courses.length === 0) {
    return (
      <section
        aria-label={t("timetable.weekCourses")}
        className="timetable-editorial-grid overflow-hidden border"
      >
        <div className="timetable-grid grid" style={getHeaderGridStyle(days.length)}>
          <WeekHeader days={days} />
        </div>
        <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CalendarOff aria-hidden="true" className="size-5" />
          </div>
          <p className="mt-3 text-sm font-semibold">{t("timetable.emptyWeek")}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("timetable.emptyWeekHint")}</p>
        </div>
      </section>
    )
  }

  const visibleDayIndexes = new Map(
    days.map((day, index) => [day.dayOfWeek, index + 2] as const),
  )
  const layouts = getCourseLayouts(courses).filter((layout) =>
    visibleDayIndexes.has(layout.course.dayOfWeek),
  )
  const lastScheduledSection = Math.max(...layouts.map((layout) => layout.course.endSection))
  const displayedSectionCount = Math.min(sectionTimes.length, Math.max(7, lastScheduledSection))
  const displayedSectionTimes = sectionTimes.slice(0, displayedSectionCount)

  return (
    <section
      aria-label={t("timetable.weekCourses")}
      className="timetable-editorial-grid overflow-hidden border"
    >
      <div className="timetable-grid grid" style={getGridStyle(days.length, displayedSectionCount)}>
        <WeekHeader days={days} />
        <SectionColumn sectionTimes={displayedSectionTimes} />

        {displayedSectionTimes.flatMap((sectionTime) =>
          days.map((day, dayIndex) => (
            <div
              key={`${day.dayOfWeek}-${sectionTime.section}`}
              aria-hidden="true"
              className={day.isToday ? "timetable-empty-cell timetable-empty-cell--today" : "timetable-empty-cell"}
              style={{
                gridColumn: dayIndex + 2,
                gridRow: sectionTime.section + 1,
              }}
            />
          )),
        )}

        {layouts.map((layout) => (
          <CourseCard
            key={layout.course.id}
            course={layout.course}
            dayColumn={visibleDayIndexes.get(layout.course.dayOfWeek) ?? 2}
            hasConflict={layout.hasConflict}
            lane={layout.lane}
            laneCount={layout.laneCount}
            onSelect={onCourseSelect}
          />
        ))}
      </div>
    </section>
  )
}
