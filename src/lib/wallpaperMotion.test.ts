import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { WallpaperMotionButton } from "@/components/wallpaper/WallpaperPicker"
import { WallpaperLayer } from "@/components/wallpaper/WallpaperLayer"
import { getWallpaperById } from "@/data/wallpapers"
import { readWallpaperPreference, saveWallpaperPreference } from "@/lib/wallpaper"
import {
  DEFAULT_WALLPAPER_MOTION,
  applyWallpaperMotionAttributes,
  normalizeWallpaperMotion,
  readWallpaperMotionPreference,
  saveWallpaperMotionPreference,
  toggleWallpaperMotion,
  toggleAndSaveWallpaperMotion,
  WALLPAPER_MOTION_STORAGE_KEY,
} from "@/lib/wallpaperMotion"

function createStorage(initial?: string): Storage {
  const values = new Map<string, string>()
  if (initial) values.set(WALLPAPER_MOTION_STORAGE_KEY, initial)
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, nextValue) => { values.set(key, nextValue) },
  } as Pick<Storage, "getItem" | "setItem"> as Storage
}

describe("wallpaper motion preferences", () => {
  it("defaults invalid or missing preferences to playing", () => {
    expect(DEFAULT_WALLPAPER_MOTION).toBe("playing")
    expect(readWallpaperMotionPreference(createStorage())).toBe("playing")
    expect(normalizeWallpaperMotion("invalid")).toBe("playing")
  })

  it("persists pause and play independently from the wallpaper selection", () => {
    const storage = createStorage()
    expect(saveWallpaperMotionPreference(storage, "paused")).toBe("paused")
    expect(storage.getItem(WALLPAPER_MOTION_STORAGE_KEY)).toBe("paused")
    expect(readWallpaperMotionPreference(storage)).toBe("paused")
    expect(saveWallpaperMotionPreference(storage, "playing")).toBe("playing")
    expect(toggleWallpaperMotion("playing")).toBe("paused")
    expect(toggleWallpaperMotion("paused")).toBe("playing")
  })

  it("renders clear desktop pause, resume, and reduced-motion controls", () => {
    const paused = renderToStaticMarkup(createElement(WallpaperMotionButton, { motionPreference: "paused", reducedMotion: false, onToggle: () => undefined }))
    const playing = renderToStaticMarkup(createElement(WallpaperMotionButton, { motionPreference: "playing", reducedMotion: false, onToggle: () => undefined }))
    const reduced = renderToStaticMarkup(createElement(WallpaperMotionButton, { motionPreference: "playing", reducedMotion: true, onToggle: () => undefined }))

    expect(paused).toContain("继续动态背景")
    expect(playing).toContain("暂停动态背景")
    expect(reduced).toContain("系统已启用减少动态效果")
    expect(reduced).toContain("disabled")
  })

  it("handles a component click by persisting pause and updating the root state", () => {
    const storage = createStorage()
    const root = { dataset: {} as DOMStringMap }
    let motion = DEFAULT_WALLPAPER_MOTION
    const onToggle = () => {
      motion = toggleAndSaveWallpaperMotion(storage, motion)
      applyWallpaperMotionAttributes(root, motion, false)
    }
    onToggle()

    expect(motion).toBe("paused")
    expect(storage.getItem(WALLPAPER_MOTION_STORAGE_KEY)).toBe("paused")
    expect(root.dataset.wallpaperMotion).toBe("paused")
    expect(renderToStaticMarkup(createElement(WallpaperMotionButton, { motionPreference: motion, reducedMotion: false, onToggle }))).toContain("继续动态背景")

    onToggle()
    expect(motion).toBe("playing")
    expect(storage.getItem(WALLPAPER_MOTION_STORAGE_KEY)).toBe("playing")
    expect(root.dataset.wallpaperMotion).toBe("playing")
  })

  it("marks reduced motion on the root without overwriting the saved preference", () => {
    const root = { dataset: {} as DOMStringMap }
    applyWallpaperMotionAttributes(root, "paused", true)
    expect(root.dataset).toMatchObject({ wallpaperMotion: "paused", reducedMotion: "true" })
    applyWallpaperMotionAttributes(root, "paused", false)
    expect(root.dataset.reducedMotion).toBeUndefined()
    expect(root.dataset.wallpaperMotion).toBe("paused")
  })

  it("passes paused and reduced states to the CSS wallpaper layer", () => {
    const wallpaper = getWallpaperById("water-02")
    const paused = renderToStaticMarkup(createElement(WallpaperLayer, { wallpaper, motionPreference: "paused", reducedMotionOverride: false }))
    const reduced = renderToStaticMarkup(createElement(WallpaperLayer, { wallpaper, motionPreference: "playing", reducedMotionOverride: true }))
    expect(paused).toContain('data-motion="paused"')
    expect(reduced).toContain('data-motion="reduced"')
    expect(paused).toContain("wallpaper-caustics")
    expect(paused).toContain("wallpaper-caustics-secondary")
    expect(paused).toContain("wallpaper-ripples")
  })

  it("does not mount the old CSS water base beneath the Water 01 image", () => {
    const markup = renderToStaticMarkup(createElement(WallpaperLayer, { wallpaper: getWallpaperById("water-01"), motionPreference: "playing", reducedMotionOverride: false }))
    expect(markup).toContain("/wallpapers/water-01.webp")
    expect(markup).not.toContain("wallpaper-water-base")
    expect(markup).not.toContain("wallpaper-caustics-secondary")
  })

  it("keeps a paused motion preference when the wallpaper changes", () => {
    const storage = createStorage()
    saveWallpaperMotionPreference(storage, "paused")
    saveWallpaperPreference(storage, "mist")
    expect(readWallpaperMotionPreference(storage)).toBe("paused")
    expect(readWallpaperPreference(storage)).toBe("mist")
  })
})
