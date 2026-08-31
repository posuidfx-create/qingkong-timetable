import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { WallpaperPickerButton } from "@/components/wallpaper/WallpaperPicker"
import { DEFAULT_WALLPAPER_ID, wallpapers } from "@/data/wallpapers"
import { normalizeWallpaperId, readWallpaperPreference, saveWallpaperPreference, WALLPAPER_STORAGE_KEY } from "@/lib/wallpaper"

function createStorage(initial?: string): Storage {
  let value = initial ?? null
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => { value = nextValue },
  } as Pick<Storage, "getItem" | "setItem"> as Storage
}

describe("wallpaper preferences", () => {
  it("falls back to the default wallpaper for an invalid id", () => {
    expect(normalizeWallpaperId("not-a-wallpaper")).toBe(DEFAULT_WALLPAPER_ID)
    expect(readWallpaperPreference(createStorage("not-a-wallpaper"))).toBe(DEFAULT_WALLPAPER_ID)
  })

  it("persists the selected wallpaper independently of theme settings", () => {
    const storage = createStorage()
    expect(saveWallpaperPreference(storage, "mist")).toBe("mist")
    expect(storage.getItem(WALLPAPER_STORAGE_KEY)).toBe("mist")
    expect(readWallpaperPreference(storage)).toBe("mist")
  })

  it("keeps built-in wallpaper choices and a usable picker trigger", () => {
    const markup = renderToStaticMarkup(createElement(WallpaperPickerButton, { onClick: () => undefined }))

    expect(wallpapers.map((wallpaper) => wallpaper.id)).toEqual(["water-01", "water-02", "mist", "deep-ocean", "night-water"])
    expect(markup).toContain("切换壁纸")
  })

  it("keeps the optimized Water 01 image as the first-visit default", () => {
    expect(DEFAULT_WALLPAPER_ID).toBe("water-01")
    expect(readWallpaperPreference(createStorage())).toBe("water-01")
    expect(wallpapers[0]).toMatchObject({ type: "image", src: "/wallpapers/water-01.webp", fallbackSrc: "/wallpapers/water-01.png" })
    expect(wallpapers.slice(1).every((wallpaper) => wallpaper.type === "css")).toBe(true)
    expect(wallpapers.some((wallpaper) => wallpaper.id.includes("motion"))).toBe(false)
  })

  it("keeps an existing wallpaper preference instead of replacing it with the new default", () => {
    expect(readWallpaperPreference(createStorage("night-water"))).toBe("night-water")
  })
})
