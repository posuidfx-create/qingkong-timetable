import type { CSSProperties } from "react"
import { TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import { getStableCourseColor } from "@/lib/timetableView"
import type { Course } from "@/types/timetable"

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
    backgroundColor: `color-mix(in oklch, ${color} 22%, var(--card))`,
    borderColor: `color-mix(in oklch, ${color} 46%, var(--border))`,
    boxShadow: `inset 3px 0 0 color-mix(in oklch, ${color} 72%, var(--foreground)), 0 3px 8px color-mix(in oklch, ${color} 16%, transparent)`,
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
  const sectionSpan = course.endSection - course.startSection + 1
  const accessibleDetails = [
    course.name,
    course.classroom,
    course.teacher,
    `第${course.startSection}至${course.endSection}节`,
    hasConflict ? "与其他课程时间冲突" : undefined,
  ]
    .filter(Boolean)
    .join("，")

  return (
    <article
      data-course-id={course.id}
      data-conflict={hasConflict ? "true" : "false"}
      className={cn(
        "relative z-10 my-[2px] min-w-0 overflow-hidden rounded-[15px] border text-card-foreground",
        hasConflict && "ring-1 ring-amber-500/65 ring-inset",
      )}
      style={getCourseCardStyle(course, dayColumn, lane, laneCount)}
    >
      <button
        type="button"
        aria-label={`查看课程：${accessibleDetails}`}
        className="size-full touch-manipulation px-1.5 py-1 text-left transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-inset"
        onClick={() => onSelect?.(course)}
      >
        {hasConflict ? (
          <span className="absolute right-0.5 top-0.5 text-amber-700 dark:text-amber-300">
            <TriangleAlert aria-hidden="true" className="size-3" />
            <span className="sr-only">与其他课程时间冲突</span>
          </span>
        ) : null}
        <h3
          className={cn(
            "break-words pr-0.5 text-[10px] font-semibold leading-[1.35] text-foreground sm:text-[11px]",
            sectionSpan === 1 ? "line-clamp-2" : sectionSpan >= 3 ? "line-clamp-4" : "line-clamp-3",
            hasConflict && "pr-3",
          )}
        >
          {course.name}
        </h3>
        {course.classroom ? (
          <p className="mt-1 truncate text-[9px] font-medium leading-tight text-foreground/75 sm:text-[10px]">
            {course.classroom}
          </p>
        ) : null}
        {course.teacher ? (
          <p className="mt-0.5 truncate text-[9px] leading-tight text-muted-foreground sm:text-[10px]">
            {course.teacher}
          </p>
        ) : null}
      </button>
    </article>
  )
}
