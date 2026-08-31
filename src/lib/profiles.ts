import { getAuthErrorMessage, parseProfile } from "@/lib/auth"
import { normalizeEditableProfileFields } from "@/lib/profileForm"
import { normalizeProfileIdentity } from "@/lib/profileIdentity"
import { supabase } from "@/lib/supabase"
import type { AppRole, Profile, ProfileCohortYear, ProfileIdentityType } from "@/types/auth"

const PROFILE_COLUMNS = "id, username, title, avatar_url, role, identity_type, cohort_year, created_at"

function requireSupabase() {
  if (!supabase) throw new Error("Supabase 尚未配置。")
  return supabase
}

function parseOrThrow(value: unknown): Profile {
  const profile = parseProfile(value)
  if (!profile) throw new Error("用户资料格式不正确，请联系管理员。")
  return profile
}

export async function fetchProfile(id: string): Promise<Profile> {
  const { data, error } = await requireSupabase().from("profiles").select(PROFILE_COLUMNS).eq("id", id).single()
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return parseOrThrow(data)
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await requireSupabase().from("profiles").select(PROFILE_COLUMNS).order("created_at", { ascending: false })
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return (data ?? []).map(parseOrThrow)
}

export async function updateProfileRole(id: string, role: Extract<AppRole, "user" | "admin">): Promise<Profile> {
  const { data, error } = await requireSupabase().rpc("set_user_role", { target_user_id: id, new_role: role })
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return parseOrThrow(data)
}

export async function updateUserProfile(id: string, username: string, title: string | null, identityType: ProfileIdentityType, cohortYear: ProfileCohortYear | null): Promise<Profile> {
  const fields = normalizeEditableProfileFields(username, title)
  const identity = normalizeProfileIdentity(identityType, cohortYear)
  const { data, error } = await requireSupabase().rpc("update_user_profile", { target_user_id: id, new_username: fields.username, new_title: fields.title, new_identity_type: identity.identityType, new_cohort_year: identity.cohortYear })
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return parseOrThrow(data)
}

export async function updateMyProfile(username: string, title: string | null, identityType: ProfileIdentityType, cohortYear: ProfileCohortYear | null): Promise<Profile> {
  const fields = normalizeEditableProfileFields(username, title)
  const identity = normalizeProfileIdentity(identityType, cohortYear)
  const { data, error } = await requireSupabase().rpc("update_my_profile", { new_username: fields.username, new_title: fields.title, new_identity_type: identity.identityType, new_cohort_year: identity.cohortYear })
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return parseOrThrow(data)
}

export async function updateOwnIdentity(profile: Profile, identityType: ProfileIdentityType, cohortYear: ProfileCohortYear | null): Promise<Profile> {
  return updateMyProfile(profile.username, profile.title, identityType, cohortYear)
}
