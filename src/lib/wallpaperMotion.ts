export type WallpaperMotionPreference = "playing" | "paused"

export const WALLPAPER_MOTION_STORAGE_KEY = "app_wallpaper_motion"
export const DEFAULT_WALLPAPER_MOTION: WallpaperMotionPreference = "playing"

export function normalizeWallpaperMotion(value: string | null | undefined): WallpaperMotionPreference {
  return value === "paused" ? "paused" : DEFAULT_WALLPAPER_MOTION
}

export function readWallpaperMotionPreference(storage: Pick<Storage, "getItem"> | undefined): WallpaperMotionPreference {
  return normalizeWallpaperMotion(storage?.getItem(WALLPAPER_MOTION_STORAGE_KEY))
}

export function saveWallpaperMotionPreference(
  storage: Pick<Storage, "setItem"> | undefined,
  preference: WallpaperMotionPreference,
): WallpaperMotionPreference {
  const normalized = normalizeWallpaperMotion(preference)
  storage?.setItem(WALLPAPER_MOTION_STORAGE_KEY, normalized)
  return normalized
}

export function toggleWallpaperMotion(preference: WallpaperMotionPreference): WallpaperMotionPreference {
  return preference === "playing" ? "paused" : "playing"
}

export function toggleAndSaveWallpaperMotion(
  storage: Pick<Storage, "setItem"> | undefined,
  preference: WallpaperMotionPreference,
): WallpaperMotionPreference {
  return saveWallpaperMotionPreference(storage, toggleWallpaperMotion(preference))
}

export function applyWallpaperMotionAttributes(
  root: { dataset: DOMStringMap },
  preference: WallpaperMotionPreference,
  reducedMotion: boolean,
): void {
  root.dataset.wallpaperMotion = preference
  if (reducedMotion) root.dataset.reducedMotion = "true"
  else delete root.dataset.reducedMotion
}
