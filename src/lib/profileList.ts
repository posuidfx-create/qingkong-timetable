import type { Profile } from "@/types/auth"

export type ProfileCohortFilter = "all" | "teacher" | 2024 | 2025

export interface ProfileCohortCounts {
  all: number
  cohort2024: number
  cohort2025: number
  teachers: number
}

export function getProfileCohortCounts(profiles: readonly Profile[]): ProfileCohortCounts {
  return {
    all: profiles.length,
    cohort2024: profiles.filter((profile) => profile.cohortYear === 2024).length,
    cohort2025: profiles.filter((profile) => profile.cohortYear === 2025).length,
    teachers: profiles.filter((profile) => profile.identityType === "teacher").length,
  }
}

export function filterProfiles(profiles: readonly Profile[], cohort: ProfileCohortFilter, search = ""): Profile[] {
  const normalizedSearch = search.trim().toLocaleLowerCase("zh-CN")
  return profiles.filter((profile) => {
  const matchesCohort = cohort === "all"
    ? true
    : cohort === "teacher"
      ? profile.identityType === "teacher"
      : profile.cohortYear === cohort
    const matchesSearch = !normalizedSearch || profile.username.toLocaleLowerCase("zh-CN").includes(normalizedSearch) || profile.title?.toLocaleLowerCase("zh-CN").includes(normalizedSearch)
    return matchesCohort && matchesSearch
  })
}
