import { DEFAULT_WALLPAPER_ID, getWallpaperById } from "@/data/wallpapers"

export const WALLPAPER_STORAGE_KEY = "app_wallpaper_id"

export function normalizeWallpaperId(value: string | null | undefined): string {
  return getWallpaperById(value).id
}

export function readWallpaperPreference(storage: Pick<Storage, "getItem"> | undefined): string {
  if (!storage) return DEFAULT_WALLPAPER_ID
  return normalizeWallpaperId(storage.getItem(WALLPAPER_STORAGE_KEY))
}

export function saveWallpaperPreference(storage: Pick<Storage, "setItem"> | undefined, wallpaperId: string): string {
  const normalized = normalizeWallpaperId(wallpaperId)
  storage?.setItem(WALLPAPER_STORAGE_KEY, normalized)
  return normalized
}
