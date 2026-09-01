import { describe, expect, it, vi } from "vitest"

import { cleanupLegacyWallpaperPreferences, LEGACY_WALLPAPER_STORAGE_KEYS } from "@/lib/legacyPreferences"

describe("legacy visual preferences", () => {
  it("safely removes both retired wallpaper keys", () => {
    const removeItem = vi.fn()
    cleanupLegacyWallpaperPreferences({ removeItem })
    expect(removeItem.mock.calls.map(([key]) => key)).toEqual([...LEGACY_WALLPAPER_STORAGE_KEYS])
  })

  it("does nothing when storage is unavailable", () => {
    expect(() => cleanupLegacyWallpaperPreferences(undefined)).not.toThrow()
  })
})
