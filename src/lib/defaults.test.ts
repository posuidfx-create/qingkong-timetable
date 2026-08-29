import { describe, expect, it } from "vitest"

import { DEFAULT_SECTION_TIMES, getSectionTime } from "./defaults"

describe("default section times", () => {
  it("contains the eleven periods from the reference schedule", () => {
    expect(DEFAULT_SECTION_TIMES).toHaveLength(11)
    expect(DEFAULT_SECTION_TIMES[0]).toEqual({
      section: 1,
      startTime: "08:00",
      endTime: "08:45",
    })
    expect(DEFAULT_SECTION_TIMES[10]).toEqual({
      section: 11,
      startTime: "19:50",
      endTime: "20:35",
    })
  })

  it("looks up a section without coupling the data to a page", () => {
    expect(getSectionTime(5)).toEqual({
      section: 5,
      startTime: "13:20",
      endTime: "14:05",
    })
  })
})
