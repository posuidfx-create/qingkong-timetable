import type { ProfileCohortYear, ProfileIdentityType } from "@/types/auth"

export interface ProfileIdentitySelection {
  identityType: ProfileIdentityType
  cohortYear: ProfileCohortYear | null
}

export function normalizeProfileIdentity(
  identityType: ProfileIdentityType | null | undefined,
  cohortYear: ProfileCohortYear | null | undefined,
): ProfileIdentitySelection {
  if (identityType === "teacher") return { identityType, cohortYear: null }
  if (identityType === "student" && (cohortYear === 2024 || cohortYear === 2025)) {
    return { identityType, cohortYear }
  }
  throw new Error("PROFILE_IDENTITY_REQUIRED")
}

export function isValidProfileIdentity(
  identityType: ProfileIdentityType | null,
  cohortYear: ProfileCohortYear | null,
): boolean {
  return identityType === "teacher"
    ? cohortYear === null
    : identityType === "student" && (cohortYear === 2024 || cohortYear === 2025)
}

export function shouldShowCohortSelection(identityType: ProfileIdentityType | null): boolean {
  return identityType === "student"
}
