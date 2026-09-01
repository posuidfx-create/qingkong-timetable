export const MAX_DESKTOP_PIXEL_HEARTS = 14
export const MAX_MOBILE_PIXEL_HEARTS = 5
export const MOBILE_PIXEL_MOTION_BREAKPOINT = 768
export const PIXEL_MOTION_DEBUG_STORAGE_KEY = "pixel_motion_debug_config"
export const PIXEL_MOTION_PREFERENCES_STORAGE_KEY = "pixel_motion_preferences"
export const PIXEL_MOTION_PREFERENCES_EVENT = "pixel-motion-preferences-change"

export const PIXEL_MOTION_LIMITS = {
  desktopBackgroundCount: { minimum: 0, maximum: MAX_DESKTOP_PIXEL_HEARTS },
  mobileBackgroundCount: { minimum: 0, maximum: MAX_MOBILE_PIXEL_HEARTS },
  backgroundSizePx: { minimum: 14, maximum: 38 },
  speed: { minimum: 0, maximum: 100 },
  backgroundOpacity: { minimum: 20, maximum: 70 },
  pointerCount: { minimum: 0, maximum: 6 },
  pointerSizePx: { minimum: 2, maximum: 10 },
  touchParticleCount: { minimum: 1, maximum: 6 },
  touchParticleSizePx: { minimum: 3, maximum: 10 },
} as const

export interface PixelMotionPreferences {
  version: 2
  enabled: boolean
  desktopBackgroundCount: number
  mobileBackgroundCount: number
  backgroundSizePx: number
  speed: number
  backgroundOpacity: number
  pointerCount: number
  pointerSizePx: number
  touchEffectsEnabled: boolean
  touchParticleCount: number
  touchParticleSizePx: number
}

export const DEFAULT_PIXEL_MOTION_PREFERENCES: Readonly<PixelMotionPreferences> = {
  version: 2,
  enabled: true,
  desktopBackgroundCount: 10,
  mobileBackgroundCount: 3,
  backgroundSizePx: 26,
  speed: 35,
  backgroundOpacity: 45,
  pointerCount: 2,
  pointerSizePx: 5,
  touchEffectsEnabled: true,
  touchParticleCount: 3,
  touchParticleSizePx: 6,
}

export interface PixelHeartMotionConfig {
  desktopCount: number
  mobileCount: number
  minDurationMs: number
  maxDurationMs: number
  mobileMinDurationMs: number
  mobileMaxDurationMs: number
  minOpacity: number
  maxOpacity: number
  mobileMinOpacity: number
  mobileMaxOpacity: number
  minSizePx: number
  maxSizePx: number
  maxDriftPx: number
}

export interface TouchPixelMotionConfig {
  enabled: boolean
  count: number
  heartChance: number
  minDurationMs: number
  maxDurationMs: number
  minSizePx: number
  maxSizePx: number
  maxActiveParticles: number
}

export interface PointerPixelMotionConfig {
  heartChance: number
  maxCount: number
  minCount: number
  minDistancePx: number
  minDurationMs: number
  maxDurationMs: number
  minIntervalMs: number
  minSizePx: number
  maxSizePx: number
}

export interface PixelMotionConfig {
  background: PixelHeartMotionConfig
  pointer: PointerPixelMotionConfig
  touch: TouchPixelMotionConfig
}

export type PixelMotionConfigOverrides = {
  background?: Partial<PixelHeartMotionConfig>
  pointer?: Partial<PointerPixelMotionConfig>
  touch?: Partial<TouchPixelMotionConfig>
}

export const DEFAULT_PIXEL_MOTION_CONFIG: Readonly<PixelMotionConfig> = {
  background: {
    desktopCount: 10,
    mobileCount: 3,
    minDurationMs: 24000,
    maxDurationMs: 36000,
    mobileMinDurationMs: 20000,
    mobileMaxDurationMs: 34000,
    minOpacity: 0.37,
    maxOpacity: 0.53,
    mobileMinOpacity: 0.4,
    mobileMaxOpacity: 0.58,
    minSizePx: 22,
    maxSizePx: 30,
    maxDriftPx: 48,
  },
  pointer: {
    heartChance: 0.28,
    maxCount: 2,
    minCount: 2,
    minDistancePx: 20,
    minDurationMs: 420,
    maxDurationMs: 760,
    minIntervalMs: 80,
    minSizePx: 3,
    maxSizePx: 7,
  },
  touch: {
    enabled: true,
    count: 3,
    heartChance: 0.34,
    minDurationMs: 450,
    maxDurationMs: 900,
    minSizePx: 4,
    maxSizePx: 8,
    maxActiveParticles: 18,
  },
}

export interface PixelHeartPlan {
  delayMs: number
  durationMs: number
  horizontalDriftPx: number
  opacity: number
  pauseAt: number
  pauseDurationRatio: number
  phase: number
  sizePx: number
  startXRatio: number
}

export interface PointerSample {
  time: number
  x: number
  y: number
}

export interface PointerPixel {
  delayMs: number
  durationMs: number
  kind: "heart" | "pixel"
  offsetX: number
  offsetY: number
  size: number
}

export const TOUCH_PIXEL_INTERACTIVE_SELECTOR = [
  "button", "a", "input", "textarea", "select", "option", "label", "form",
  "[role='button']", "[role='dialog']", "[role='menu']", "[role='slider']", "[role='switch']",
  "[contenteditable='true']", "[data-radix-popper-content-wrapper]", ".app-bottom-nav",
].join(", ")

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function finite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function optionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function roundClamped(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return Math.round(clamp(finite(value, fallback), minimum, maximum))
}

export function normalizePixelMotionPreferences(value: unknown): PixelMotionPreferences {
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2)) return { ...DEFAULT_PIXEL_MOTION_PREFERENCES }
  const legacyBackgroundCount = roundClamped(value.backgroundCount, DEFAULT_PIXEL_MOTION_PREFERENCES.desktopBackgroundCount, 0, MAX_DESKTOP_PIXEL_HEARTS)
  const migratedMobileCount = legacyBackgroundCount === 0
    ? 0
    : legacyBackgroundCount <= 3
      ? legacyBackgroundCount
      : legacyBackgroundCount <= 7
        ? 3
        : legacyBackgroundCount <= 11
          ? 4
          : 5
  return {
    version: 2,
    enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_PIXEL_MOTION_PREFERENCES.enabled,
    desktopBackgroundCount: roundClamped(value.version === 1 ? legacyBackgroundCount : value.desktopBackgroundCount, DEFAULT_PIXEL_MOTION_PREFERENCES.desktopBackgroundCount, PIXEL_MOTION_LIMITS.desktopBackgroundCount.minimum, PIXEL_MOTION_LIMITS.desktopBackgroundCount.maximum),
    mobileBackgroundCount: roundClamped(value.version === 1 ? migratedMobileCount : value.mobileBackgroundCount, DEFAULT_PIXEL_MOTION_PREFERENCES.mobileBackgroundCount, PIXEL_MOTION_LIMITS.mobileBackgroundCount.minimum, PIXEL_MOTION_LIMITS.mobileBackgroundCount.maximum),
    backgroundSizePx: roundClamped(value.backgroundSizePx, DEFAULT_PIXEL_MOTION_PREFERENCES.backgroundSizePx, PIXEL_MOTION_LIMITS.backgroundSizePx.minimum, PIXEL_MOTION_LIMITS.backgroundSizePx.maximum),
    speed: roundClamped(value.speed, DEFAULT_PIXEL_MOTION_PREFERENCES.speed, PIXEL_MOTION_LIMITS.speed.minimum, PIXEL_MOTION_LIMITS.speed.maximum),
    backgroundOpacity: roundClamped(value.backgroundOpacity, DEFAULT_PIXEL_MOTION_PREFERENCES.backgroundOpacity, PIXEL_MOTION_LIMITS.backgroundOpacity.minimum, PIXEL_MOTION_LIMITS.backgroundOpacity.maximum),
    pointerCount: roundClamped(value.pointerCount, DEFAULT_PIXEL_MOTION_PREFERENCES.pointerCount, PIXEL_MOTION_LIMITS.pointerCount.minimum, PIXEL_MOTION_LIMITS.pointerCount.maximum),
    pointerSizePx: roundClamped(value.pointerSizePx, DEFAULT_PIXEL_MOTION_PREFERENCES.pointerSizePx, PIXEL_MOTION_LIMITS.pointerSizePx.minimum, PIXEL_MOTION_LIMITS.pointerSizePx.maximum),
    touchEffectsEnabled: value.version === 2 && typeof value.touchEffectsEnabled === "boolean" ? value.touchEffectsEnabled : DEFAULT_PIXEL_MOTION_PREFERENCES.touchEffectsEnabled,
    touchParticleCount: roundClamped(value.version === 2 ? value.touchParticleCount : undefined, DEFAULT_PIXEL_MOTION_PREFERENCES.touchParticleCount, PIXEL_MOTION_LIMITS.touchParticleCount.minimum, PIXEL_MOTION_LIMITS.touchParticleCount.maximum),
    touchParticleSizePx: roundClamped(value.version === 2 ? value.touchParticleSizePx : undefined, DEFAULT_PIXEL_MOTION_PREFERENCES.touchParticleSizePx, PIXEL_MOTION_LIMITS.touchParticleSizePx.minimum, PIXEL_MOTION_LIMITS.touchParticleSizePx.maximum),
  }
}

type PixelMotionPreferenceStorage = Pick<Storage, "getItem"> & Partial<Pick<Storage, "setItem">>

export function loadPixelMotionPreferences(storage: PixelMotionPreferenceStorage | undefined): PixelMotionPreferences {
  if (!storage) return { ...DEFAULT_PIXEL_MOTION_PREFERENCES }
  try {
    const raw = storage.getItem(PIXEL_MOTION_PREFERENCES_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PIXEL_MOTION_PREFERENCES }
    const parsed: unknown = JSON.parse(raw)
    const normalized = normalizePixelMotionPreferences(parsed)
    if (isRecord(parsed) && parsed.version === 1 && storage.setItem) {
      storage.setItem(PIXEL_MOTION_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized))
    }
    return normalized
  } catch {
    return { ...DEFAULT_PIXEL_MOTION_PREFERENCES }
  }
}

export function savePixelMotionPreferences(storage: Pick<Storage, "setItem">, value: unknown): PixelMotionPreferences {
  const normalized = normalizePixelMotionPreferences(value)
  storage.setItem(PIXEL_MOTION_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export function mapPixelMotionSpeed(speed: number): { minDurationMs: number; maxDurationMs: number } {
  const normalized = clamp(finite(speed, DEFAULT_PIXEL_MOTION_PREFERENCES.speed), 0, 100)
  if (normalized <= 35) {
    const progress = normalized / 35
    return { minDurationMs: Math.round(38000 - 14000 * progress), maxDurationMs: Math.round(50000 - 14000 * progress) }
  }
  const progress = (normalized - 35) / 65
  return { minDurationMs: Math.round(24000 - 10000 * progress), maxDurationMs: Math.round(36000 - 14000 * progress) }
}

export function pixelMotionPreferencesToConfig(preferences: PixelMotionPreferences): PixelMotionConfig {
  const normalized = normalizePixelMotionPreferences(preferences)
  const durations = mapPixelMotionSpeed(normalized.speed)
  const opacity = normalized.backgroundOpacity / 100
  return {
    background: {
      desktopCount: normalized.desktopBackgroundCount,
      mobileCount: normalized.mobileBackgroundCount,
      minDurationMs: durations.minDurationMs,
      maxDurationMs: durations.maxDurationMs,
      mobileMinDurationMs: Math.max(14000, durations.minDurationMs - 4000),
      mobileMaxDurationMs: Math.max(20000, durations.maxDurationMs - 2000),
      minOpacity: clamp(opacity - 0.08, PIXEL_MOTION_LIMITS.backgroundOpacity.minimum / 100, PIXEL_MOTION_LIMITS.backgroundOpacity.maximum / 100),
      maxOpacity: clamp(opacity + 0.08, PIXEL_MOTION_LIMITS.backgroundOpacity.minimum / 100, PIXEL_MOTION_LIMITS.backgroundOpacity.maximum / 100),
      mobileMinOpacity: Number(clamp(opacity - 0.05, PIXEL_MOTION_LIMITS.backgroundOpacity.minimum / 100, PIXEL_MOTION_LIMITS.backgroundOpacity.maximum / 100).toFixed(4)),
      mobileMaxOpacity: Number(clamp(opacity + 0.13, PIXEL_MOTION_LIMITS.backgroundOpacity.minimum / 100, PIXEL_MOTION_LIMITS.backgroundOpacity.maximum / 100).toFixed(4)),
      minSizePx: clamp(normalized.backgroundSizePx - 4, PIXEL_MOTION_LIMITS.backgroundSizePx.minimum, PIXEL_MOTION_LIMITS.backgroundSizePx.maximum),
      maxSizePx: clamp(normalized.backgroundSizePx + 4, PIXEL_MOTION_LIMITS.backgroundSizePx.minimum, PIXEL_MOTION_LIMITS.backgroundSizePx.maximum),
      maxDriftPx: DEFAULT_PIXEL_MOTION_CONFIG.background.maxDriftPx,
    },
    pointer: {
      ...DEFAULT_PIXEL_MOTION_CONFIG.pointer,
      minCount: normalized.pointerCount,
      maxCount: normalized.pointerCount,
      minSizePx: clamp(normalized.pointerSizePx - 2, PIXEL_MOTION_LIMITS.pointerSizePx.minimum, PIXEL_MOTION_LIMITS.pointerSizePx.maximum),
      maxSizePx: clamp(normalized.pointerSizePx + 2, PIXEL_MOTION_LIMITS.pointerSizePx.minimum, PIXEL_MOTION_LIMITS.pointerSizePx.maximum),
    },
    touch: {
      ...DEFAULT_PIXEL_MOTION_CONFIG.touch,
      enabled: normalized.touchEffectsEnabled,
      count: normalized.touchParticleCount,
      minSizePx: clamp(normalized.touchParticleSizePx - 2, 3, 10),
      maxSizePx: clamp(normalized.touchParticleSizePx + 2, 3, 10),
    },
  }
}

function parsePixelMotionOverrides(raw: string): PixelMotionConfigOverrides {
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed)) return {}
  const background = isRecord(parsed.background) ? parsed.background : {}
  const pointer = isRecord(parsed.pointer) ? parsed.pointer : {}
  const touch = isRecord(parsed.touch) ? parsed.touch : {}
  return {
    background: {
      desktopCount: optionalNumber(background, "desktopCount"), mobileCount: optionalNumber(background, "mobileCount"),
      minDurationMs: optionalNumber(background, "minDurationMs"), maxDurationMs: optionalNumber(background, "maxDurationMs"),
      mobileMinDurationMs: optionalNumber(background, "mobileMinDurationMs"), mobileMaxDurationMs: optionalNumber(background, "mobileMaxDurationMs"),
      minOpacity: optionalNumber(background, "minOpacity"), maxOpacity: optionalNumber(background, "maxOpacity"),
      mobileMinOpacity: optionalNumber(background, "mobileMinOpacity"), mobileMaxOpacity: optionalNumber(background, "mobileMaxOpacity"),
      minSizePx: optionalNumber(background, "minSizePx"), maxSizePx: optionalNumber(background, "maxSizePx"), maxDriftPx: optionalNumber(background, "maxDriftPx"),
    },
    pointer: {
      heartChance: optionalNumber(pointer, "heartChance"), maxCount: optionalNumber(pointer, "maxCount"), minCount: optionalNumber(pointer, "minCount"),
      minDistancePx: optionalNumber(pointer, "minDistancePx"), minDurationMs: optionalNumber(pointer, "minDurationMs"), maxDurationMs: optionalNumber(pointer, "maxDurationMs"),
      minIntervalMs: optionalNumber(pointer, "minIntervalMs"), minSizePx: optionalNumber(pointer, "minSizePx"), maxSizePx: optionalNumber(pointer, "maxSizePx"),
    },
    touch: {
      count: optionalNumber(touch, "count"), heartChance: optionalNumber(touch, "heartChance"),
      minDurationMs: optionalNumber(touch, "minDurationMs"), maxDurationMs: optionalNumber(touch, "maxDurationMs"),
      minSizePx: optionalNumber(touch, "minSizePx"), maxSizePx: optionalNumber(touch, "maxSizePx"),
      maxActiveParticles: optionalNumber(touch, "maxActiveParticles"),
    },
  }
}

export function normalizePixelMotionConfig(overrides: PixelMotionConfigOverrides = {}, base: PixelMotionConfig = DEFAULT_PIXEL_MOTION_CONFIG): PixelMotionConfig {
  const background: PixelHeartMotionConfig = {
    desktopCount: overrides.background?.desktopCount ?? base.background.desktopCount,
    mobileCount: overrides.background?.mobileCount ?? base.background.mobileCount,
    minDurationMs: overrides.background?.minDurationMs ?? base.background.minDurationMs,
    maxDurationMs: overrides.background?.maxDurationMs ?? base.background.maxDurationMs,
    mobileMinDurationMs: overrides.background?.mobileMinDurationMs ?? base.background.mobileMinDurationMs,
    mobileMaxDurationMs: overrides.background?.mobileMaxDurationMs ?? base.background.mobileMaxDurationMs,
    minOpacity: overrides.background?.minOpacity ?? base.background.minOpacity,
    maxOpacity: overrides.background?.maxOpacity ?? base.background.maxOpacity,
    mobileMinOpacity: overrides.background?.mobileMinOpacity ?? base.background.mobileMinOpacity,
    mobileMaxOpacity: overrides.background?.mobileMaxOpacity ?? base.background.mobileMaxOpacity,
    minSizePx: overrides.background?.minSizePx ?? base.background.minSizePx,
    maxSizePx: overrides.background?.maxSizePx ?? base.background.maxSizePx,
    maxDriftPx: overrides.background?.maxDriftPx ?? base.background.maxDriftPx,
  }
  const pointer: PointerPixelMotionConfig = {
    heartChance: overrides.pointer?.heartChance ?? base.pointer.heartChance,
    maxCount: overrides.pointer?.maxCount ?? base.pointer.maxCount,
    minCount: overrides.pointer?.minCount ?? base.pointer.minCount,
    minDistancePx: overrides.pointer?.minDistancePx ?? base.pointer.minDistancePx,
    minDurationMs: overrides.pointer?.minDurationMs ?? base.pointer.minDurationMs,
    maxDurationMs: overrides.pointer?.maxDurationMs ?? base.pointer.maxDurationMs,
    minIntervalMs: overrides.pointer?.minIntervalMs ?? base.pointer.minIntervalMs,
    minSizePx: overrides.pointer?.minSizePx ?? base.pointer.minSizePx,
    maxSizePx: overrides.pointer?.maxSizePx ?? base.pointer.maxSizePx,
  }
  const touch: TouchPixelMotionConfig = {
    enabled: base.touch.enabled,
    count: overrides.touch?.count ?? base.touch.count,
    heartChance: overrides.touch?.heartChance ?? base.touch.heartChance,
    minDurationMs: overrides.touch?.minDurationMs ?? base.touch.minDurationMs,
    maxDurationMs: overrides.touch?.maxDurationMs ?? base.touch.maxDurationMs,
    minSizePx: overrides.touch?.minSizePx ?? base.touch.minSizePx,
    maxSizePx: overrides.touch?.maxSizePx ?? base.touch.maxSizePx,
    maxActiveParticles: overrides.touch?.maxActiveParticles ?? base.touch.maxActiveParticles,
  }
  const minSizePx = clamp(finite(background.minSizePx, base.background.minSizePx), 12, 38)
  const maxSizePx = clamp(finite(background.maxSizePx, 32), minSizePx, 40)
  const minDurationMs = clamp(finite(background.minDurationMs, base.background.minDurationMs), 14000, 50000)
  const maxDurationMs = clamp(finite(background.maxDurationMs, base.background.maxDurationMs), minDurationMs, 50000)
  const mobileMinDurationMs = clamp(finite(background.mobileMinDurationMs, base.background.mobileMinDurationMs), 14000, 50000)
  const mobileMaxDurationMs = clamp(finite(background.mobileMaxDurationMs, base.background.mobileMaxDurationMs), mobileMinDurationMs, 50000)
  const minOpacity = clamp(finite(background.minOpacity, 0.32), 0.16, 0.72)
  const mobileMinOpacity = clamp(finite(background.mobileMinOpacity, 0.4), 0.2, 0.7)
  const pointerMinCount = Math.round(clamp(finite(pointer.minCount, base.pointer.minCount), 0, 6))
  const pointerMinDurationMs = clamp(finite(pointer.minDurationMs, 420), 260, 900)
  const pointerMinSizePx = clamp(finite(pointer.minSizePx, 3), 2, 8)
  const touchMinDurationMs = clamp(finite(touch.minDurationMs, 450), 350, 900)
  const touchMinSizePx = clamp(finite(touch.minSizePx, 4), 3, 10)
  return {
    background: {
      desktopCount: Math.round(clamp(finite(background.desktopCount, 10), 0, MAX_DESKTOP_PIXEL_HEARTS)),
      mobileCount: Math.round(clamp(finite(background.mobileCount, 3), 0, MAX_MOBILE_PIXEL_HEARTS)),
      minDurationMs,
      maxDurationMs,
      mobileMinDurationMs,
      mobileMaxDurationMs,
      minOpacity,
      maxOpacity: clamp(finite(background.maxOpacity, 0.54), minOpacity, 0.78),
      mobileMinOpacity,
      mobileMaxOpacity: clamp(finite(background.mobileMaxOpacity, 0.58), mobileMinOpacity, 0.78),
      minSizePx,
      maxSizePx,
      maxDriftPx: clamp(finite(background.maxDriftPx, 48), 12, 72),
    },
    pointer: {
      heartChance: clamp(finite(pointer.heartChance, 0.28), 0, 0.6),
      maxCount: Math.round(clamp(finite(pointer.maxCount, base.pointer.maxCount), pointerMinCount, 6)),
      minCount: pointerMinCount,
      minDistancePx: clamp(finite(pointer.minDistancePx, 20), 12, 48),
      minDurationMs: pointerMinDurationMs,
      maxDurationMs: clamp(finite(pointer.maxDurationMs, 760), pointerMinDurationMs, 1100),
      minIntervalMs: clamp(finite(pointer.minIntervalMs, 80), 48, 180),
      minSizePx: pointerMinSizePx,
      maxSizePx: clamp(finite(pointer.maxSizePx, 7), pointerMinSizePx, 10),
    },
    touch: {
      enabled: touch.enabled,
      count: Math.round(clamp(finite(touch.count, 3), 1, 6)),
      heartChance: clamp(finite(touch.heartChance, 0.34), 0, 0.6),
      minDurationMs: touchMinDurationMs,
      maxDurationMs: clamp(finite(touch.maxDurationMs, 900), touchMinDurationMs, 1100),
      minSizePx: touchMinSizePx,
      maxSizePx: clamp(finite(touch.maxSizePx, 8), touchMinSizePx, 10),
      maxActiveParticles: Math.round(clamp(finite(touch.maxActiveParticles, 18), 6, 18)),
    },
  }
}

export function readPixelMotionConfig(storage: Pick<Storage, "getItem"> | undefined, allowDebugOverrides: boolean): PixelMotionConfig {
  const preferences = loadPixelMotionPreferences(storage)
  const base = pixelMotionPreferencesToConfig(preferences)
  if (!storage || !allowDebugOverrides) return base
  try {
    const raw = storage.getItem(PIXEL_MOTION_DEBUG_STORAGE_KEY)
    return normalizePixelMotionConfig(raw ? parsePixelMotionOverrides(raw) : undefined, base)
  } catch {
    return base
  }
}

export function isPixelDebugMode(search: string, development: boolean): boolean {
  return development && new URLSearchParams(search).get("pixelDebug") === "1"
}

export function isPixelMotionEnabled(reducedMotion: boolean, userEnabled = true): boolean {
  return userEnabled && !reducedMotion
}

export function isPointerPixelFieldEnabled(viewportWidth: number, reducedMotion: boolean, userEnabled = true): boolean {
  return viewportWidth >= MOBILE_PIXEL_MOTION_BREAKPOINT && userEnabled && !reducedMotion
}

export function getPixelHeartCount(viewportWidth: number, config: PixelMotionConfig = normalizePixelMotionConfig()): number {
  return viewportWidth < MOBILE_PIXEL_MOTION_BREAKPOINT ? config.background.mobileCount : config.background.desktopCount
}

export function getInitialPixelHeartOffsetMs(slot: number, activeCount: number, durationMs: number): number {
  if (slot <= 0 || activeCount <= 1) return 0
  return (slot / activeCount) * durationMs * 0.86
}

export function createPixelHeartPlan(
  random: () => number = Math.random,
  slot = 0,
  initial = false,
  config: PixelMotionConfig = normalizePixelMotionConfig(),
  mobile = false,
): PixelHeartPlan {
  const { background } = config
  return {
    delayMs: initial ? (mobile ? 400 + random() * 700 + slot * 460 : random() * 1200 + slot * 360) : 700 + random() * 2800,
    durationMs: (mobile ? background.mobileMinDurationMs : background.minDurationMs) + random() * ((mobile ? background.mobileMaxDurationMs : background.maxDurationMs) - (mobile ? background.mobileMinDurationMs : background.minDurationMs)),
    horizontalDriftPx: (random() * 2 - 1) * background.maxDriftPx,
    opacity: (mobile ? background.mobileMinOpacity : background.minOpacity) + random() * ((mobile ? background.mobileMaxOpacity : background.maxOpacity) - (mobile ? background.mobileMinOpacity : background.minOpacity)),
    pauseAt: 0.24 + random() * 0.5,
    pauseDurationRatio: 0.025 + random() * 0.05,
    phase: random() * Math.PI * 2,
    sizePx: background.minSizePx + random() * (background.maxSizePx - background.minSizePx),
    startXRatio: 0.05 + random() * 0.9,
  }
}

export function isTouchPixelTargetAllowed(target: EventTarget | null): boolean {
  return target instanceof Element && !target.closest(TOUCH_PIXEL_INTERACTIVE_SELECTOR)
}

export function isTouchPixelResponseEnabled(pointerType: string, reducedMotion: boolean, preferences: PixelMotionPreferences): boolean {
  return pointerType === "touch" && preferences.enabled && preferences.touchEffectsEnabled && !reducedMotion
}

export function createTouchPixelBurst(
  random: () => number = Math.random,
  config: TouchPixelMotionConfig = DEFAULT_PIXEL_MOTION_CONFIG.touch,
): PointerPixel[] {
  return Array.from({ length: config.count }, () => {
    const angle = random() * Math.PI * 2
    const distance = 16 + random() * 20
    return {
      delayMs: random() * 45,
      durationMs: config.minDurationMs + random() * (config.maxDurationMs - config.minDurationMs),
      kind: random() < config.heartChance ? "heart" : "pixel",
      offsetX: Math.cos(angle) * distance,
      offsetY: Math.sin(angle) * distance - 4,
      size: config.minSizePx + random() * (config.maxSizePx - config.minSizePx),
    }
  })
}

export function applyPixelHeartPause(progress: number, pauseAt: number, pauseDurationRatio: number): number {
  const safeProgress = clamp(progress, 0, 1)
  const pauseEnd = Math.min(0.94, pauseAt + pauseDurationRatio)
  if (safeProgress <= pauseAt) return safeProgress
  if (safeProgress <= pauseEnd) return pauseAt
  return pauseAt + ((safeProgress - pauseEnd) * (1 - pauseAt)) / (1 - pauseEnd)
}

export function shouldSamplePointer(
  previous: PointerSample | null,
  next: PointerSample,
  config: PointerPixelMotionConfig = DEFAULT_PIXEL_MOTION_CONFIG.pointer,
): boolean {
  if (!previous) return true
  if (next.time - previous.time < config.minIntervalMs) return false
  return Math.hypot(next.x - previous.x, next.y - previous.y) >= config.minDistancePx
}

export function createPointerPixelBurst(
  random: () => number = Math.random,
  config: PointerPixelMotionConfig = DEFAULT_PIXEL_MOTION_CONFIG.pointer,
): PointerPixel[] {
  const count = config.minCount + Math.floor(random() * (config.maxCount - config.minCount + 1))
  return Array.from({ length: count }, () => {
    const angle = random() * Math.PI * 2
    const distance = 12 + random() * 14
    return {
      delayMs: random() * 80,
      durationMs: config.minDurationMs + random() * (config.maxDurationMs - config.minDurationMs),
      kind: random() < config.heartChance ? "heart" : "pixel",
      offsetX: Math.cos(angle) * distance,
      offsetY: Math.sin(angle) * distance,
      size: config.minSizePx + random() * (config.maxSizePx - config.minSizePx),
    }
  })
}

export function getPixelResponse(
  pointerX: number,
  pointerY: number,
  cellX: number,
  cellY: number,
  radius = 88,
  maxOffset = 4,
): { offsetX: number; offsetY: number; intensity: number } {
  const deltaX = cellX - pointerX
  const deltaY = cellY - pointerY
  const distance = Math.hypot(deltaX, deltaY)
  if (distance >= radius || distance === 0) return { offsetX: 0, offsetY: 0, intensity: distance === 0 ? 1 : 0 }
  const intensity = 1 - distance / radius
  const scale = (maxOffset * intensity) / distance
  return { offsetX: deltaX * scale, offsetY: deltaY * scale, intensity }
}

export function updatePixelResponseCells(root: HTMLElement, clientX: number, clientY: number): void {
  const rootRect = root.getBoundingClientRect()
  const pointerX = clientX - rootRect.left
  const pointerY = clientY - rootRect.top
  root.querySelectorAll<HTMLElement>("[data-pixel-cell]").forEach((cell) => {
    const rect = cell.getBoundingClientRect()
    const response = getPixelResponse(pointerX, pointerY, rect.left - rootRect.left + rect.width / 2, rect.top - rootRect.top + rect.height / 2)
    cell.style.setProperty("--pixel-x", `${response.offsetX.toFixed(2)}px`)
    cell.style.setProperty("--pixel-y", `${response.offsetY.toFixed(2)}px`)
    cell.style.setProperty("--pixel-intensity", response.intensity.toFixed(3))
  })
}

export function resetPixelResponseCells(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("[data-pixel-cell]").forEach((cell) => {
    cell.style.removeProperty("--pixel-x")
    cell.style.removeProperty("--pixel-y")
    cell.style.removeProperty("--pixel-intensity")
  })
}
