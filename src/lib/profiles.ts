import { getAuthErrorMessage, parseProfile } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import type { AppRole, Profile, ProfileCohortYear } from "@/types/auth"

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
  const { data, error } = await requireSupabase().from("profiles").select("id, username, avatar_url, role, cohort_year, created_at").eq("id", id).single()
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return parseOrThrow(data)
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await requireSupabase().from("profiles").select("id, username, avatar_url, role, cohort_year, created_at").order("created_at", { ascending: false })
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return (data ?? []).map(parseOrThrow)
}

export async function updateProfileRole(id: string, role: Extract<AppRole, "user" | "admin">): Promise<Profile> {
  const { data, error } = await requireSupabase().rpc("set_user_role", { target_user_id: id, new_role: role })
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return parseOrThrow(data)
}

export async function updateOwnCohortYear(cohortYear: ProfileCohortYear): Promise<Profile> {
  const client = requireSupabase()
  const { data: authData } = await client.auth.getUser()
  if (!authData.user) throw new Error("登录状态已失效，请重新登录。")
  const { data, error } = await client.from("profiles").update({ cohort_year: cohortYear }).eq("id", authData.user.id).select("id, username, avatar_url, role, cohort_year, created_at").single()
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return parseOrThrow(data)
}
