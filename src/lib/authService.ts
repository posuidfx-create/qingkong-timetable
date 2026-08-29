import { getAuthErrorMessage } from "@/lib/auth"
import { setAuthPersistence } from "@/lib/authPersistence"
import { supabase } from "@/lib/supabase"

export interface AuthActionResult {
  error?: string
  needsEmailConfirmation?: boolean
}

function requireSupabase() {
  if (!supabase) throw new Error("Supabase 尚未配置。")
  return supabase
}

export async function signInWithPassword(email: string, password: string, rememberMe: boolean): Promise<AuthActionResult> {
  setAuthPersistence(rememberMe)
  const { error } = await requireSupabase().auth.signInWithPassword({ email, password })
  return error ? { error: getAuthErrorMessage(error.message) } : {}
}

export async function signUpWithPassword(
  email: string,
  password: string,
  username: string,
): Promise<AuthActionResult> {
  const { data, error } = await requireSupabase().auth.signUp({
    email,
    password,
    options: { data: { username } },
  })
  if (error) return { error: getAuthErrorMessage(error.message) }
  return { needsEmailConfirmation: !data.session }
}

export async function signOut(): Promise<AuthActionResult> {
  const { error } = await requireSupabase().auth.signOut()
  return error ? { error: getAuthErrorMessage(error.message) } : {}
}
