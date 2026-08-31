import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CourseCard } from "@/components/timetable/CourseCard"
import type { Course } from "@/types/timetable"

const longCourse: Course = {
  id: "course-long-name",
  name: "习近平新时代中国特色社会主义思想概论",
  classroom: "A7-322",
  teacher: "王老师",
  dayOfWeek: 1,
  startSection: 1,
  endSection: 2,
  weeks: [1],
  color: "#4eb6ce",
}

describe("CourseCard", () => {
  it("renders a long course name with a multi-line, safe-width title", () => {
    const markup = renderToStaticMarkup(createElement(CourseCard, {
      course: longCourse,
      dayColumn: 2,
      hasConflict: false,
      lane: 0,
      laneCount: 1,
    }))

    expect(markup).toContain(longCourse.name)
    expect(markup).toContain("break-words")
    expect(markup).toContain("line-clamp-3")
    expect(markup).toContain("px-2")
    expect(markup).toContain("text-[11px]")
  })
})
