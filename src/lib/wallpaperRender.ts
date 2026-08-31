import type { WallpaperDefinition } from "@/data/wallpapers"

interface WallpaperRenderPreferences {
  reducedMotion: boolean
  viewportWidth: number
  videoFailed: boolean
  userPaused: boolean
  saveData?: boolean
}

/** Video wallpaper is intentionally desktop-only and always has CSS behind it. */
export function shouldPlayWallpaperVideo(
  wallpaper: WallpaperDefinition,
  preferences: WallpaperRenderPreferences,
): boolean {
  return wallpaper.type === "video"
    && Boolean(wallpaper.src)
    && !preferences.reducedMotion
    && preferences.viewportWidth >= 768
    && !preferences.videoFailed
    && !preferences.userPaused
    && !preferences.saveData
}

export function shouldMountWallpaperVideo(
  wallpaper: WallpaperDefinition,
  preferences: Omit<WallpaperRenderPreferences, "userPaused">,
): boolean {
  return wallpaper.type === "video"
    && Boolean(wallpaper.src)
    && !preferences.reducedMotion
    && preferences.viewportWidth >= 768
    && !preferences.videoFailed
    && !preferences.saveData
}

export function resolveVideoWallpaperFallback(
  wallpaper: WallpaperDefinition,
  posterFailed: boolean,
): "poster" | "css" {
  return wallpaper.type === "video" && Boolean(wallpaper.poster) && !posterFailed
    ? "poster"
    : "css"
}
