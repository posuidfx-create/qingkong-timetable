import { describe, expect, it } from "vitest"

import { canManageRole } from "@/lib/auth"
import { filterProfiles, getProfileCohortCounts } from "@/lib/profileList"
import type { Profile } from "@/types/auth"

const profiles: Profile[] = [
  { id: "24", username: "学习委员小林", title: "班委", avatarUrl: null, role: "user", identityType: "student", cohortYear: 2024, createdAt: "2026-01-01" },
  { id: "25", username: "学习委员小周", title: null, avatarUrl: null, role: "admin", identityType: "student", cohortYear: 2025, createdAt: "2026-01-02" },
  { id: "none", username: "未设置", title: null, avatarUrl: null, role: "user", identityType: null, cohortYear: null, createdAt: "2026-01-03" },
  { id: "teacher", username: "田中先生", title: "講師", avatarUrl: null, role: "user", identityType: "teacher", cohortYear: null, createdAt: "2026-01-04" },
]

describe("profile cohort filtering", () => {
  it("defaults to all profiles and counts each account cohort", () => {
    expect(filterProfiles(profiles, "all")).toHaveLength(4)
    expect(getProfileCohortCounts(profiles)).toEqual({ all: 4, cohort2024: 1, cohort2025: 1, teachers: 1 })
  })
  it("filters teachers independently from cohort years", () => {
    expect(filterProfiles(profiles, "teacher").map((profile) => profile.id)).toEqual(["teacher"])
  })
  it("filters only by the account profile cohort year", () => {
    expect(filterProfiles(profiles, 2024).map((profile) => profile.id)).toEqual(["24"])
    expect(filterProfiles(profiles, 2025).map((profile) => profile.id)).toEqual(["25"])
    expect(filterProfiles(profiles, 2024)).not.toContainEqual(profiles[2])
  })
  it("combines cohort filtering with username search", () => {
    expect(filterProfiles(profiles, 2025, "学习委员").map((profile) => profile.id)).toEqual(["25"])
    expect(filterProfiles(profiles, 2024, "小周")).toEqual([])
    expect(filterProfiles(profiles, "all", "班委").map((profile) => profile.id)).toEqual(["24"])
  })
  it("does not change role-management eligibility", () => {
    const superAdmin = { ...profiles[0], role: "super_admin" as const }
    expect(canManageRole(superAdmin, profiles[1])).toBe(true)
    expect(canManageRole(superAdmin, filterProfiles(profiles, 2025)[0])).toBe(true)
  })
})
