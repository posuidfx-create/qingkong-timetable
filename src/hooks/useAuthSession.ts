import { useEffect } from "react"

import { toAuthUser } from "@/lib/auth"
import { fetchProfile } from "@/lib/profiles"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"
import { authStore } from "@/store/authStore"

export function useAuthSession(): void {
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      authStore.getState().setUnavailable()
      return
    }

    let active = true
    const applySession = async (user: { id: string; email?: string | null } | null) => {
      if (!user) {
        if (active) authStore.getState().setAnonymous()
        return
      }
      try {
        const profile = await fetchProfile(user.id)
        if (active) authStore.getState().setAuthenticated(toAuthUser(user), profile)
      } catch (error) {
        if (active) {
          authStore.getState().setAnonymous()
          authStore.getState().setError(error instanceof Error ? error.message : "无法读取用户资料。")
        }
      }
    }

    authStore.getState().setLoading()
    void supabase.auth.getSession().then(({ data }) => applySession(data.session?.user ?? null))
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.user ?? null)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])
}
