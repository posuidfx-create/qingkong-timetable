export const LEGACY_WALLPAPER_STORAGE_KEYS = ["app_wallpaper_id", "app_wallpaper_motion"] as const

export function cleanupLegacyWallpaperPreferences(storage: Pick<Storage, "removeItem"> | undefined): void {
  if (!storage) return
  for (const key of LEGACY_WALLPAPER_STORAGE_KEYS) storage.removeItem(key)
}
