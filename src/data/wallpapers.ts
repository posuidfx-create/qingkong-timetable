export type WallpaperType = "css" | "image" | "video"

export interface WallpaperDefinition {
  id: string
  name: string
  type: WallpaperType
  src?: string
  fallbackSrc?: string
  poster?: string
  fallbackId?: string
}

export const DEFAULT_WALLPAPER_ID = "water-01"

export const wallpapers: readonly WallpaperDefinition[] = [
  { id: "water-01", name: "Water 01", type: "image", src: "/wallpapers/water-01.webp", fallbackSrc: "/wallpapers/water-01.png" },
  { id: "water-02", name: "Water 02", type: "css" },
  { id: "mist", name: "Mist", type: "css" },
  { id: "deep-ocean", name: "Deep Ocean", type: "css" },
  { id: "night-water", name: "Night Water", type: "css" },
]

export function getWallpaperById(id: string | null | undefined): WallpaperDefinition {
  return wallpapers.find((wallpaper) => wallpaper.id === id) ?? wallpapers[0]
}
