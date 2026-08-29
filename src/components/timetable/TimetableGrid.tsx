import type { CSSProperties } from "react"
import { CalendarOff } from "lucide-react"

import { CourseCard } from "@/components/timetable/CourseCard"
import { SectionColumn } from "@/components/timetable/SectionColumn"
import { WeekHeader } from "@/components/timetable/WeekHeader"
import { getCourseLayouts, type WeekDayView } from "@/lib/timetableView"
import type { Course, SectionTime } from "@/types/timetable"

interface TimetableGridProps {
  courses: readonly Course[]
  days: readonly WeekDayView[]
  sectionTimes: readonly SectionTime[]
  onCourseSelect?: (course: Course) => void
}

function getGridStyle(dayCount: number): CSSProperties {
  return {
    gridTemplateColumns: `2.85rem repeat(${dayCount}, minmax(0, 1fr))`,
    gridTemplateRows: "var(--timetable-grid-rows, 3.5rem repeat(11, 4.25rem))",
  }
}

function getHeaderGridStyle(dayCount: number): CSSProperties {
  return {
    gridTemplateColumns: `2.85rem repeat(${dayCount}, minmax(0, 1fr))`,
    gridTemplateRows: "3.5rem",
  }
}

export function TimetableGrid({ courses, days, onCourseSelect, sectionTimes }: TimetableGridProps) {
  if (courses.length === 0) {
    return (
      <section
        aria-label="本周课程"
        className="mx-3 overflow-hidden rounded-2xl border bg-card shadow-xs sm:mx-5"
      >
        <div className="timetable-grid grid" style={getHeaderGridStyle(days.length)}>
          <WeekHeader days={days} />
        </div>
        <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CalendarOff aria-hidden="true" className="size-5" />
          </div>
          <p className="mt-3 text-sm font-semibold">本周暂无课程</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">可以切换其他教学周查看安排</p>
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

  return (
    <section
      aria-label="本周课程"
      className="mx-2 overflow-hidden rounded-2xl border bg-card shadow-xs sm:mx-4"
    >
      <div className="timetable-grid grid" style={getGridStyle(days.length)}>
        <WeekHeader days={days} />
        <SectionColumn sectionTimes={sectionTimes} />

        {sectionTimes.flatMap((sectionTime) =>
          days.map((day, dayIndex) => (
            <div
              key={`${day.dayOfWeek}-${sectionTime.section}`}
              aria-hidden="true"
              className="border-l border-t bg-background/35"
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
