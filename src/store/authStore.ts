import { useStore } from "zustand"
import { createStore } from "zustand/vanilla"

import type { AuthStatus, AuthUser, Profile } from "@/types/auth"

interface AuthStoreState {
  status: AuthStatus
  user: AuthUser | null
  profile: Profile | null
  error: string | null
}

interface AuthStoreActions {
  setLoading: () => void
  setAuthenticated: (user: AuthUser, profile: Profile) => void
  updateProfile: (profile: Profile) => void
  setAnonymous: () => void
  setUnavailable: () => void
  setError: (error: string) => void
}

export type AuthStore = AuthStoreState & AuthStoreActions

export const authStore = createStore<AuthStore>((set) => ({
  status: "loading",
  user: null,
  profile: null,
  error: null,
  setLoading: () => set({ status: "loading", error: null }),
  setAuthenticated: (user, profile) => set({ status: "authenticated", user, profile, error: null }),
  updateProfile: (profile) => set({ profile }),
  setAnonymous: () => set({ status: "anonymous", user: null, profile: null, error: null }),
  setUnavailable: () => set({ status: "unavailable", user: null, profile: null, error: null }),
  setError: (error) => set({ error }),
}))

export function useAuthStore<T>(selector: (state: AuthStore) => T): T {
  return useStore(authStore, selector)
}
