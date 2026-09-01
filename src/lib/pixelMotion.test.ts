import { existsSync, readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PixelHeartDrift } from "@/components/pixel/PixelHeartDrift"
import { PixelMotionSettingsPanel } from "@/components/pixel/PixelMotionSettingsPanel"
import { TouchPixelResponse } from "@/components/pixel/TouchPixelResponse"
import {
  applyPixelHeartPause,
  createPixelHeartPlan,
  createPointerPixelBurst,
  createTouchPixelBurst,
  DEFAULT_PIXEL_MOTION_CONFIG,
  DEFAULT_PIXEL_MOTION_PREFERENCES,
  getPixelHeartCount,
  getInitialPixelHeartOffsetMs,
  getPixelResponse,
  isPixelDebugMode,
  isPixelMotionEnabled,
  isPointerPixelFieldEnabled,
  isTouchPixelResponseEnabled,
  loadPixelMotionPreferences,
  mapPixelMotionSpeed,
  MAX_DESKTOP_PIXEL_HEARTS,
  MAX_MOBILE_PIXEL_HEARTS,
  normalizePixelMotionConfig,
  normalizePixelMotionPreferences,
  pixelMotionPreferencesToConfig,
  PIXEL_MOTION_DEBUG_STORAGE_KEY,
  PIXEL_MOTION_PREFERENCES_STORAGE_KEY,
  readPixelMotionConfig,
  savePixelMotionPreferences,
  shouldSamplePointer,
  TOUCH_PIXEL_INTERACTIVE_SELECTOR,
} from "@/lib/pixelMotion"
import { I18nProvider } from "@/i18n/I18nProvider"
import { MemoryStorage } from "@/test/memoryStorage"

describe("pixel editorial motion", () => {
  it("renders a bounded pool of refined pixel heart slots without arrow geometry", () => {
    const markup = renderToStaticMarkup(createElement(PixelHeartDrift, { random: () => 0.5 }))
    expect(markup.match(/data-pixel-heart/g)).toHaveLength(MAX_DESKTOP_PIXEL_HEARTS)
    expect(markup).toContain('shape-rendering="crispEdges"')
    expect(markup).toContain("pixel-heart-float__highlight")
    expect(markup).not.toContain("pixel-heart-arrow__shaft")
    expect(markup).not.toContain("pixel-heart-arrow__tip")
  })

  it("uses ten desktop hearts and three independently configured mobile hearts by default", () => {
    expect(getPixelHeartCount(1440)).toBe(10)
    expect(getPixelHeartCount(390)).toBe(3)
    expect(DEFAULT_PIXEL_MOTION_CONFIG.background.desktopCount).toBeGreaterThanOrEqual(8)
    expect(DEFAULT_PIXEL_MOTION_CONFIG.background.desktopCount).toBeLessThanOrEqual(14)
    expect(DEFAULT_PIXEL_MOTION_CONFIG.background.mobileCount).toBe(3)
  })

  it("keeps heart size, duration and opacity inside the configured soft range", () => {
    const minimum = createPixelHeartPlan(() => 0)
    const maximum = createPixelHeartPlan(() => 0.999)
    expect(minimum.sizePx).toBe(22)
    expect(maximum.sizePx).toBeLessThanOrEqual(30)
    expect(minimum.durationMs).toBe(24000)
    expect(maximum.durationMs).toBeLessThanOrEqual(36000)
    expect(minimum.opacity).toBe(0.37)
    expect(maximum.opacity).toBeLessThanOrEqual(0.53)
  })

  it("distributes initial hearts through the viewport instead of clustering at the bottom", () => {
    expect(getInitialPixelHeartOffsetMs(0, 10, 30000)).toBe(0)
    expect(getInitialPixelHeartOffsetMs(5, 10, 30000)).toBe(12900)
    expect(getInitialPixelHeartOffsetMs(9, 10, 30000)).toBeLessThan(30000)
  })

  it("adds a bounded pause without preventing the heart from completing", () => {
    expect(applyPixelHeartPause(0.3, 0.3, 0.05)).toBe(0.3)
    expect(applyPixelHeartPause(0.33, 0.3, 0.05)).toBe(0.3)
    expect(applyPixelHeartPause(1, 0.3, 0.05)).toBe(1)
  })

  it("clamps debug overrides to the performance and accessibility envelope", () => {
    const config = normalizePixelMotionConfig({ background: { desktopCount: 99, mobileCount: 99, maxSizePx: 100, minDurationMs: 1000 }, pointer: { maxCount: 99, heartChance: 2 } })
    expect(config.background.desktopCount).toBe(14)
    expect(config.background.mobileCount).toBe(5)
    expect(config.background.maxSizePx).toBe(40)
    expect(config.background.minDurationMs).toBe(14000)
    expect(config.pointer.maxCount).toBe(6)
    expect(config.pointer.heartChance).toBe(0.6)
  })

  it("reads localStorage overrides only when development overrides are allowed", () => {
    const storage = { getItem: (key: string) => key === PIXEL_MOTION_DEBUG_STORAGE_KEY ? JSON.stringify({ background: { desktopCount: 12, minSizePx: 22 }, pointer: { heartChance: 0.4 } }) : null }
    expect(readPixelMotionConfig(storage, true).background.desktopCount).toBe(12)
    expect(readPixelMotionConfig(storage, true).background.minSizePx).toBe(22)
    expect(readPixelMotionConfig(storage, true).pointer.heartChance).toBe(0.4)
    expect(readPixelMotionConfig(storage, false)).toEqual(DEFAULT_PIXEL_MOTION_CONFIG)
  })

  it("enables no-preference desktop motion and preserves reduced-motion", () => {
    expect(isPixelMotionEnabled(false)).toBe(true)
    expect(isPointerPixelFieldEnabled(1440, false)).toBe(true)
    expect(isPointerPixelFieldEnabled(390, false)).toBe(false)
    expect(isPixelMotionEnabled(true)).toBe(false)
    expect(isPixelMotionEnabled(false, false)).toBe(false)
    expect(isPointerPixelFieldEnabled(1440, false, false)).toBe(false)
  })

  it("loads, saves and resets versioned formal preferences", () => {
    const storage = new MemoryStorage()
    expect(loadPixelMotionPreferences(storage)).toEqual(DEFAULT_PIXEL_MOTION_PREFERENCES)
    const saved = savePixelMotionPreferences(storage, { ...DEFAULT_PIXEL_MOTION_PREFERENCES, desktopBackgroundCount: 12, mobileBackgroundCount: 4, pointerCount: 4 })
    expect(saved.desktopBackgroundCount).toBe(12)
    expect(saved.mobileBackgroundCount).toBe(4)
    expect(loadPixelMotionPreferences(storage).pointerCount).toBe(4)
    expect(JSON.parse(storage.getItem(PIXEL_MOTION_PREFERENCES_STORAGE_KEY) ?? "{}").version).toBe(2)
    expect(savePixelMotionPreferences(storage, DEFAULT_PIXEL_MOTION_PREFERENCES)).toEqual(DEFAULT_PIXEL_MOTION_PREFERENCES)
  })

  it("migrates and persists every supported v1 desktop count into a valid v2 responsive preference", () => {
    const cases = [[0, 0], [1, 1], [3, 3], [4, 3], [7, 3], [8, 4], [11, 4], [12, 5], [14, 5]] as const
    for (const [legacyCount, expectedMobileCount] of cases) {
      const storage = new MemoryStorage()
      storage.setItem(PIXEL_MOTION_PREFERENCES_STORAGE_KEY, JSON.stringify({ ...DEFAULT_PIXEL_MOTION_PREFERENCES, version: 1, backgroundCount: legacyCount }))
      const migrated = loadPixelMotionPreferences(storage)
      expect(migrated).toMatchObject({ version: 2, desktopBackgroundCount: legacyCount, mobileBackgroundCount: expectedMobileCount })
      expect(JSON.parse(storage.getItem(PIXEL_MOTION_PREFERENCES_STORAGE_KEY) ?? "{}")).toMatchObject({ version: 2, desktopBackgroundCount: legacyCount, mobileBackgroundCount: expectedMobileCount })
    }
  })

  it("falls back from malformed JSON and unsupported preference versions", () => {
    const malformed = { getItem: () => "{bad" }
    const future = { getItem: () => JSON.stringify({ version: 3, enabled: false, desktopBackgroundCount: 1 }) }
    expect(loadPixelMotionPreferences(malformed)).toEqual(DEFAULT_PIXEL_MOTION_PREFERENCES)
    expect(loadPixelMotionPreferences(future)).toEqual(DEFAULT_PIXEL_MOTION_PREFERENCES)
  })

  it("clamps every user-facing value and rejects non-finite or negative values", () => {
    const normalized = normalizePixelMotionPreferences({ version: 2, enabled: false, desktopBackgroundCount: -5, mobileBackgroundCount: 99, backgroundSizePx: 99, speed: Number.POSITIVE_INFINITY, backgroundOpacity: 100, pointerCount: 20, pointerSizePx: -1, touchParticleCount: 20, touchParticleSizePx: -4 })
    expect(normalized).toMatchObject({ enabled: false, desktopBackgroundCount: 0, mobileBackgroundCount: 5, backgroundSizePx: 38, speed: 35, backgroundOpacity: 70, pointerCount: 6, pointerSizePx: 2, touchParticleCount: 6, touchParticleSizePx: 3 })
  })

  it("maps independent formal counts directly to desktop 0-14 and mobile 0-5", () => {
    const config = pixelMotionPreferencesToConfig({ ...DEFAULT_PIXEL_MOTION_PREFERENCES, desktopBackgroundCount: 14, mobileBackgroundCount: 5 })
    expect(getPixelHeartCount(1440, config)).toBe(14)
    expect(getPixelHeartCount(390, config)).toBe(5)
    expect(getPixelHeartCount(390, pixelMotionPreferencesToConfig({ ...DEFAULT_PIXEL_MOTION_PREFERENCES, mobileBackgroundCount: 0 }))).toBe(0)
    expect(MAX_MOBILE_PIXEL_HEARTS).toBe(5)
  })

  it("maps the slow-to-fast control to a deliberately calm duration envelope", () => {
    expect(mapPixelMotionSpeed(0)).toEqual({ minDurationMs: 38000, maxDurationMs: 50000 })
    expect(mapPixelMotionSpeed(35)).toEqual({ minDurationMs: 24000, maxDurationMs: 36000 })
    expect(mapPixelMotionSpeed(100)).toEqual({ minDurationMs: 14000, maxDurationMs: 22000 })
  })

  it("uses user preferences in production and development debug overrides only in development", () => {
    const storage = new MemoryStorage()
    storage.setItem(PIXEL_MOTION_PREFERENCES_STORAGE_KEY, JSON.stringify({ ...DEFAULT_PIXEL_MOTION_PREFERENCES, desktopBackgroundCount: 4, backgroundSizePx: 18 }))
    storage.setItem(PIXEL_MOTION_DEBUG_STORAGE_KEY, JSON.stringify({ background: { desktopCount: 13, minSizePx: 30 } }))
    expect(readPixelMotionConfig(storage, false).background.desktopCount).toBe(4)
    expect(readPixelMotionConfig(storage, false).background.minSizePx).toBe(14)
    expect(readPixelMotionConfig(storage, true).background.desktopCount).toBe(13)
    expect(readPixelMotionConfig(storage, true).background.minSizePx).toBe(30)
  })

  it("renders bilingual accessible user controls without exposing debug parameters", () => {
    const desktopMarkup = renderToStaticMarkup(createElement(I18nProvider, null, createElement(PixelMotionSettingsPanel, { mode: "desktop" })))
    const mobileMarkup = renderToStaticMarkup(createElement(I18nProvider, null, createElement(PixelMotionSettingsPanel, { mode: "mobile" })))
    expect(desktopMarkup).toContain("像素动效")
    expect(desktopMarkup).toContain('max="14"')
    expect(mobileMarkup).toContain('max="5"')
    expect(mobileMarkup).toContain("触摸粒子")
    expect(mobileMarkup).toContain('type="range"')
    expect(mobileMarkup).toContain('aria-label="数量"')
    expect(mobileMarkup).toContain("恢复默认")
    expect(mobileMarkup).not.toContain("minDurationMs")
    expect(mobileMarkup).not.toContain("heartChance")
  })

  it("makes mobile count, size, speed and opacity settings produce visibly distinct plans", () => {
    const sparse = pixelMotionPreferencesToConfig({ ...DEFAULT_PIXEL_MOTION_PREFERENCES, mobileBackgroundCount: 1, backgroundSizePx: 16, speed: 0, backgroundOpacity: 25 })
    const defaultPlan = createPixelHeartPlan(() => 0.5, 0, true, pixelMotionPreferencesToConfig(DEFAULT_PIXEL_MOTION_PREFERENCES), true)
    const vivid = pixelMotionPreferencesToConfig({ ...DEFAULT_PIXEL_MOTION_PREFERENCES, mobileBackgroundCount: 5, backgroundSizePx: 36, speed: 100, backgroundOpacity: 65 })
    const sparsePlan = createPixelHeartPlan(() => 0.5, 0, true, sparse, true)
    const vividPlan = createPixelHeartPlan(() => 0.5, 0, true, vivid, true)
    expect([getPixelHeartCount(390, sparse), getPixelHeartCount(390), getPixelHeartCount(390, vivid)]).toEqual([1, 3, 5])
    expect(sparsePlan.sizePx).toBeLessThan(defaultPlan.sizePx)
    expect(defaultPlan.sizePx).toBeLessThan(vividPlan.sizePx)
    expect(sparsePlan.durationMs).toBeGreaterThan(defaultPlan.durationMs)
    expect(defaultPlan.durationMs).toBeGreaterThan(vividPlan.durationMs)
    expect(sparsePlan.opacity).toBeLessThan(defaultPlan.opacity)
    expect(defaultPlan.opacity).toBeLessThan(vividPlan.opacity)
  })

  it("creates bounded touch-only responses and preserves reduced-motion precedence", () => {
    const preferences = { ...DEFAULT_PIXEL_MOTION_PREFERENCES, touchParticleCount: 6 }
    const config = pixelMotionPreferencesToConfig(preferences)
    const particles = createTouchPixelBurst(() => 0.5, config.touch)
    expect(particles).toHaveLength(6)
    expect(particles.every((particle) => particle.durationMs >= 450 && particle.durationMs <= 900)).toBe(true)
    expect(particles.every((particle) => particle.size >= 3 && particle.size <= 10)).toBe(true)
    expect(isTouchPixelResponseEnabled("touch", false, preferences)).toBe(true)
    expect(isTouchPixelResponseEnabled("mouse", false, preferences)).toBe(false)
    expect(isTouchPixelResponseEnabled("pen", false, preferences)).toBe(false)
    expect(isTouchPixelResponseEnabled("touch", true, preferences)).toBe(false)
    expect(isTouchPixelResponseEnabled("touch", false, { ...preferences, touchEffectsEnabled: false })).toBe(false)
  })

  it("excludes controls, sliders, dialogs and bottom navigation from touch decoration", () => {
    expect(TOUCH_PIXEL_INTERACTIVE_SELECTOR).toContain("button")
    expect(TOUCH_PIXEL_INTERACTIVE_SELECTOR).toContain("input")
    expect(TOUCH_PIXEL_INTERACTIVE_SELECTOR).toContain("[role='slider']")
    expect(TOUCH_PIXEL_INTERACTIVE_SELECTOR).toContain("[role='dialog']")
    expect(TOUCH_PIXEL_INTERACTIVE_SELECTOR).toContain(".app-bottom-nav")
  })

  it("renders the touch response layer without React-managed particle nodes", () => {
    const markup = renderToStaticMarkup(createElement(TouchPixelResponse))
    expect(markup).toContain("touch-pixel-response")
    expect(markup).not.toContain("data-touch-pixel")
  })

  it("broadcasts saved preferences so mounted motion layers rebuild in real time", () => {
    const hookSource = readFileSync(new URL("../hooks/usePixelMotionPreferences.ts", import.meta.url), "utf8")
    expect(hookSource).toContain("PIXEL_MOTION_PREFERENCES_EVENT")
    expect(hookSource).toContain("window.dispatchEvent")
    expect(hookSource).toContain("window.addEventListener(PIXEL_MOTION_PREFERENCES_EVENT")
    expect(hookSource).toContain("window.removeEventListener(PIXEL_MOTION_PREFERENCES_EVENT")
  })

  it("keeps debug mode development-only", () => {
    expect(isPixelDebugMode("?pixelDebug=1", true)).toBe(true)
    expect(isPixelDebugMode("?pixelDebug=1", false)).toBe(false)
  })

  it("keeps CTA pointer displacement local and capped", () => {
    const nearby = getPixelResponse(10, 10, 30, 10)
    const far = getPixelResponse(10, 10, 200, 200)
    expect(Math.abs(nearby.offsetX)).toBeLessThanOrEqual(4)
    expect(nearby.intensity).toBeGreaterThan(0)
    expect(far).toEqual({ offsetX: 0, offsetY: 0, intensity: 0 })
  })

  it("throttles pointer sampling using the centralized config", () => {
    const previous = { time: 100, x: 20, y: 20 }
    expect(shouldSamplePointer(null, previous)).toBe(true)
    expect(shouldSamplePointer(previous, { time: 150, x: 100, y: 20 })).toBe(false)
    expect(shouldSamplePointer(previous, { time: 200, x: 30, y: 20 })).toBe(false)
    expect(shouldSamplePointer(previous, { time: 200, x: 50, y: 20 })).toBe(true)
  })

  it("creates configured short-lived pointer pixels with optional micro hearts", () => {
    const pixels = createPointerPixelBurst(() => 0.1, { ...DEFAULT_PIXEL_MOTION_CONFIG.pointer, heartChance: 1, minCount: 2, maxCount: 2 })
    expect(pixels).toHaveLength(2)
    expect(pixels.every((pixel) => pixel.kind === "heart")).toBe(true)
    expect(pixels.every((pixel) => pixel.durationMs >= 420 && pixel.durationMs <= 760)).toBe(true)
    expect(pixels.every((pixel) => Math.hypot(pixel.offsetX, pixel.offsetY) >= 12 && Math.hypot(pixel.offsetX, pixel.offsetY) <= 26)).toBe(true)
  })

  it("defines hidden-page pause, reduced-motion and cleanup contracts", () => {
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8")
    const source = readFileSync(new URL("../components/pixel/PixelHeartDrift.tsx", import.meta.url), "utf8")
    const pointerSource = readFileSync(new URL("../components/pixel/PointerPixelField.tsx", import.meta.url), "utf8")
    const touchSource = readFileSync(new URL("../components/pixel/TouchPixelResponse.tsx", import.meta.url), "utf8")
    expect(css).toMatch(/\.pixel-heart-drift\s*\{[\s\S]*?pointer-events:\s*none/)
    expect(css).toMatch(/prefers-reduced-motion:[\s\S]*?\.pixel-heart-drift/)
    expect(source).toContain("pauseDuration = now - hiddenAt")
    expect(source).toContain('document.addEventListener("visibilitychange"')
    expect(source).toContain('document.removeEventListener("visibilitychange"')
    expect(source).toContain("window.cancelAnimationFrame(frame)")
    expect(pointerSource).toContain("INTERACTIVE_SELECTOR")
    expect(pointerSource).toContain("pixel.remove()")
    expect(pointerSource).toContain("root.replaceChildren()")
    expect(pointerSource).toContain('event.pointerType !== "mouse"')
    expect(touchSource).toContain('window.addEventListener("pointerdown"')
    expect(touchSource).not.toContain('window.addEventListener("pointermove"')
    expect(touchSource).toContain("config.touch.maxActiveParticles")
    expect(touchSource).toContain('window.removeEventListener("pointerdown"')
    expect(touchSource).toContain("root.replaceChildren()")
  })

  it("keeps retired wallpaper assets removed", () => {
    const root = new URL("../../", import.meta.url)
    expect(existsSync(new URL("src/components/wallpaper/WallpaperPicker.tsx", root))).toBe(false)
    expect(existsSync(new URL("src/data/wallpapers.ts", root))).toBe(false)
    expect(existsSync(new URL("public/wallpapers/water-01.webp", root))).toBe(false)
    expect(existsSync(new URL("public/wallpapers/water-01.png", root))).toBe(false)
  })
})
