import type { CSSProperties } from "react"
import { TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import { getStableCourseColor } from "@/lib/timetableView"
import type { Course } from "@/types/timetable"
import { useI18n } from "@/i18n/useI18n"
import { formatTranslation } from "@/i18n/translate"

interface CourseCardProps {
  course: Course
  hasConflict: boolean
  lane: number
  laneCount: number
  dayColumn: number
  onSelect?: (course: Course) => void
}

function getCourseCardStyle(
  course: Course,
  dayColumn: number,
  lane: number,
  laneCount: number,
): CSSProperties {
  const color = getStableCourseColor(course)
  return {
    gridColumn: dayColumn,
    gridRow: `${course.startSection + 1} / ${course.endSection + 2}`,
    width: `calc(${100 / laneCount}% - 3px)`,
    marginInlineStart: `calc(${(lane * 100) / laneCount}% + 1.5px)`,
    backgroundColor: `color-mix(in oklch, ${color} 10%, var(--background))`,
    borderColor: `color-mix(in oklch, ${color} 28%, var(--border))`,
    boxShadow: `inset 2px 0 0 color-mix(in oklch, ${color} 88%, var(--foreground))`,
  }
}

export function CourseCard({
  course,
  hasConflict,
  lane,
  laneCount,
  dayColumn,
  onSelect,
}: CourseCardProps) {
  const { t } = useI18n()
  const sectionSpan = course.endSection - course.startSection + 1
  const accessibleDetails = [
    course.name,
    course.classroom,
    course.teacher,
    formatTranslation(t("timetable.sectionRange"), { start: course.startSection, end: course.endSection }),
    hasConflict ? t("timetable.courseConflictAria") : undefined,
  ]
    .filter(Boolean)
    .join("，")

  return (
    <article
      data-course-id={course.id}
      data-conflict={hasConflict ? "true" : "false"}
      className={cn(
        "timetable-course-block relative z-10 my-[3px] min-w-0 overflow-hidden rounded-md border text-card-foreground",
        hasConflict && "ring-1 ring-amber-500/65 ring-inset",
      )}
      style={getCourseCardStyle(course, dayColumn, lane, laneCount)}
    >
      <button
        type="button"
        aria-label={`${t("timetable.viewCourse")}：${accessibleDetails}`}
        className="size-full touch-manipulation px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-inset sm:px-3"
        onClick={() => onSelect?.(course)}
      >
        {hasConflict ? (
          <span className="absolute right-0.5 top-0.5 text-amber-700 dark:text-amber-300">
            <TriangleAlert aria-hidden="true" className="size-3" />
            <span className="sr-only">{t("timetable.courseConflictAria")}</span>
          </span>
        ) : null}
        <h3
          className={cn(
            "timetable-course-title break-words pr-0.5 text-[11px] font-medium leading-[1.42] text-foreground sm:text-[12px] lg:text-[13px]",
            sectionSpan === 1 ? "line-clamp-2" : sectionSpan >= 3 ? "line-clamp-3 lg:line-clamp-4" : "line-clamp-3",
            hasConflict && "pr-3",
          )}
        >
          {course.name}
        </h3>
        {course.classroom ? (
          <p className="timetable-course-meta mt-1 truncate text-[9px] font-medium leading-tight text-foreground/75 sm:text-[10px] lg:text-[11px]">
            {course.classroom}
          </p>
        ) : null}
        {course.teacher ? (
          <p className="timetable-course-meta mt-0.5 truncate text-[9px] leading-tight text-muted-foreground sm:text-[10px] lg:text-[11px]">
            {course.teacher}
          </p>
        ) : null}
      </button>
    </article>
  )
}
