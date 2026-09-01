import { useCallback, useEffect, useState } from "react"

import {
  DEFAULT_PIXEL_MOTION_PREFERENCES,
  loadPixelMotionPreferences,
  normalizePixelMotionPreferences,
  PIXEL_MOTION_PREFERENCES_EVENT,
  PIXEL_MOTION_PREFERENCES_STORAGE_KEY,
  savePixelMotionPreferences,
  type PixelMotionPreferences,
} from "@/lib/pixelMotion"

type PreferencePatch = Partial<Omit<PixelMotionPreferences, "version">>

function readPreferences(): PixelMotionPreferences {
  return typeof window === "undefined"
    ? { ...DEFAULT_PIXEL_MOTION_PREFERENCES }
    : loadPixelMotionPreferences(window.localStorage)
}

function broadcastPreferences(preferences: PixelMotionPreferences): void {
  window.dispatchEvent(new CustomEvent<PixelMotionPreferences>(PIXEL_MOTION_PREFERENCES_EVENT, { detail: preferences }))
}

export function usePixelMotionPreferences() {
  const [preferences, setPreferences] = useState<PixelMotionPreferences>(readPreferences)

  useEffect(() => {
    const handlePreferenceChange = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as unknown : undefined
      setPreferences(detail ? normalizePixelMotionPreferences(detail) : readPreferences())
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === PIXEL_MOTION_PREFERENCES_STORAGE_KEY) setPreferences(readPreferences())
    }
    window.addEventListener(PIXEL_MOTION_PREFERENCES_EVENT, handlePreferenceChange)
    window.addEventListener("storage", handleStorage)
    return () => {
      window.removeEventListener(PIXEL_MOTION_PREFERENCES_EVENT, handlePreferenceChange)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  const updatePreferences = useCallback((patch: PreferencePatch) => {
    const current = loadPixelMotionPreferences(window.localStorage)
    const next = savePixelMotionPreferences(window.localStorage, { ...current, ...patch, version: 2 })
    setPreferences(next)
    broadcastPreferences(next)
  }, [])

  const resetPreferences = useCallback(() => {
    const next = savePixelMotionPreferences(window.localStorage, DEFAULT_PIXEL_MOTION_PREFERENCES)
    setPreferences(next)
    broadcastPreferences(next)
  }, [])

  return { preferences, resetPreferences, updatePreferences }
}
