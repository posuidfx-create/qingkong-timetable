import { describe, expect, it } from "vitest"

import { isValidProfileIdentity, normalizeProfileIdentity, shouldShowCohortSelection } from "@/lib/profileIdentity"
import { getBuiltinCourses } from "@/data/builtinTimetables"

describe("profile identity", () => {
  it("accepts students with the supported cohorts", () => {
    expect(normalizeProfileIdentity("student", 2024)).toEqual({ identityType: "student", cohortYear: 2024 })
    expect(normalizeProfileIdentity("student", 2025)).toEqual({ identityType: "student", cohortYear: 2025 })
  })

  it("normalizes teachers to a null cohort", () => {
    expect(normalizeProfileIdentity("teacher", 2025)).toEqual({ identityType: "teacher", cohortYear: null })
    expect(isValidProfileIdentity("teacher", null)).toBe(true)
    expect(isValidProfileIdentity("teacher", 2024)).toBe(false)
  })

  it("rejects a student without a supported cohort", () => {
    expect(() => normalizeProfileIdentity("student", null)).toThrow("PROFILE_IDENTITY_REQUIRED")
    expect(isValidProfileIdentity("student", null)).toBe(false)
  })

  it("shows cohort selection only for students", () => {
    expect(shouldShowCohortSelection("student")).toBe(true)
    expect(shouldShowCohortSelection("teacher")).toBe(false)
    expect(shouldShowCohortSelection(null)).toBe(false)
  })

  it("keeps timetable viewing independent from a teacher account cohort", () => {
    expect(getBuiltinCourses(2024)).toHaveLength(8)
    expect(getBuiltinCourses(2025)).toHaveLength(25)
  })
})
