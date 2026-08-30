import { createClient } from "@supabase/supabase-js"
import { createAuthStorage } from "@/lib/authPersistence"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: createAuthStorage(window.localStorage, window.sessionStorage) },
    })
  : null

/**
 * Restores a persisted Supabase session through the same client instance.
 * `setSession` emits the normal auth event that synchronizes the client's REST
 * and Realtime authorization state; it does not expose or manually attach a token.
 */
export async function synchronizeSupabaseSession(): Promise<{ hasSession: boolean; hasAccessToken: boolean; expiresAt: number | null }> {
  if (!supabase) return { hasSession: false, hasAccessToken: false, expiresAt: null }
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const session = sessionData.session
  if (!session) return { hasSession: false, hasAccessToken: false, expiresAt: null }
  const { error } = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })
  if (error) throw error
  return { hasSession: true, hasAccessToken: Boolean(session.access_token), expiresAt: session.expires_at ?? null }
}
