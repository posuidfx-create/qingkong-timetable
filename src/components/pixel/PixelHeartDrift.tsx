import { useEffect, useRef } from "react"

import { usePixelMotionPreferences } from "@/hooks/usePixelMotionPreferences"

import {
  applyPixelHeartPause,
  createPixelHeartPlan,
  getPixelHeartCount,
  getInitialPixelHeartOffsetMs,
  isPixelDebugMode,
  isPixelMotionEnabled,
  MAX_DESKTOP_PIXEL_HEARTS,
  MOBILE_PIXEL_MOTION_BREAKPOINT,
  readPixelMotionConfig,
  type PixelHeartPlan,
} from "@/lib/pixelMotion"

interface PixelHeartDriftProps {
  random?: () => number
}

interface HeartRuntime {
  plan: PixelHeartPlan
  startAt: number
}

export function PixelHeartDrift({ random = Math.random }: PixelHeartDriftProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { preferences } = usePixelMotionPreferences()

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const hearts = [...root.querySelectorAll<HTMLElement>("[data-pixel-heart]")]
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)")
    const debug = isPixelDebugMode(window.location.search, import.meta.env.DEV)
    const config = readPixelMotionConfig(window.localStorage, import.meta.env.DEV)
    const pointer = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY }
    let frame = 0
    let activeCount = 0
    let hiddenAt: number | null = null
    let runtimes: HeartRuntime[] = []
    let spawnCount = 0

    const configure = (now: number) => {
      const mobile = window.innerWidth < MOBILE_PIXEL_MOTION_BREAKPOINT
      const enabled = !reducedMotion.matches && (debug || isPixelMotionEnabled(false, preferences.enabled))
      activeCount = enabled ? getPixelHeartCount(window.innerWidth, config) : 0
      runtimes = hearts.map((heart, slot) => {
        const plan = createPixelHeartPlan(random, slot, true, config, mobile)
        heart.hidden = slot >= activeCount
        heart.dataset.state = slot < activeCount ? "waiting" : "disabled"
        heart.style.width = `${plan.sizePx.toFixed(2)}px`
        heart.style.height = `${plan.sizePx.toFixed(2)}px`
        return { plan, startAt: now + plan.delayMs - getInitialPixelHeartOffsetMs(slot, activeCount, plan.durationMs) }
      })
      root.dataset.reducedMotion = reducedMotion.matches ? "true" : "false"
      root.dataset.state = enabled ? "waiting" : "disabled"
      root.dataset.activeCount = String(activeCount)
      root.dataset.viewport = mobile ? "mobile" : "desktop"
      if (import.meta.env.DEV) {
        root.dataset.debug = debug ? "true" : "false"
        root.dataset.durationRange = mobile ? `${config.background.mobileMinDurationMs}-${config.background.mobileMaxDurationMs}` : `${config.background.minDurationMs}-${config.background.maxDurationMs}`
        root.dataset.opacityRange = mobile ? `${config.background.mobileMinOpacity}-${config.background.mobileMaxOpacity}` : `${config.background.minOpacity}-${config.background.maxOpacity}`
        root.dataset.sizeRange = `${config.background.minSizePx}-${config.background.maxSizePx}`
        root.dataset.spawnCount = String(spawnCount)
      }
    }

    const tick = (now: number) => {
      const width = window.innerWidth
      const height = window.innerHeight
      const mobile = width < MOBILE_PIXEL_MOTION_BREAKPOINT
      let anyActive = false
      for (let slot = 0; slot < activeCount; slot += 1) {
        const heart = hearts[slot]
        const runtime = runtimes[slot]
        if (now < runtime.startAt) {
          heart.style.opacity = "0"
          heart.dataset.state = "waiting"
          continue
        }
        const rawProgress = (now - runtime.startAt) / runtime.plan.durationMs
        if (rawProgress >= 1) {
          const nextPlan = createPixelHeartPlan(random, slot, false, config, mobile)
          runtimes[slot] = { plan: nextPlan, startAt: now + nextPlan.delayMs }
          heart.style.width = `${nextPlan.sizePx.toFixed(2)}px`
          heart.style.height = `${nextPlan.sizePx.toFixed(2)}px`
          heart.dataset.state = "waiting"
          heart.style.opacity = "0"
          continue
        }
        if (heart.dataset.state !== "active") {
          spawnCount += 1
          if (import.meta.env.DEV) root.dataset.spawnCount = String(spawnCount)
          heart.dataset.state = "active"
        }
        anyActive = true
        const progress = applyPixelHeartPause(rawProgress, runtime.plan.pauseAt, runtime.plan.pauseDurationRatio)
        const startY = height + runtime.plan.sizePx * 1.5
        const y = startY - progress * (height + runtime.plan.sizePx * 3)
        const sway = Math.sin(progress * Math.PI * 2 + runtime.plan.phase) * runtime.plan.horizontalDriftPx
        const x = width * runtime.plan.startXRatio + sway
        const distance = Math.hypot(pointer.x - x, pointer.y - y)
        const proximity = hoverCapable.matches && distance < 104 ? (1 - distance / 104) * 7 : 0
        const offsetX = Number.isFinite(pointer.x) ? Math.sign(x - pointer.x) * proximity : 0
        const offsetY = Number.isFinite(pointer.y) ? Math.sign(y - pointer.y) * proximity : 0
        const edgeFade = Math.min(1, rawProgress * 7, (1 - rawProgress) * 7)
        const pulse = 1 + Math.sin(progress * Math.PI * 4 + runtime.plan.phase) * 0.035
        const rotation = Math.sin(progress * Math.PI * 2 + runtime.plan.phase) * 3.5
        heart.style.opacity = String((debug ? Math.max(0.78, runtime.plan.opacity) : runtime.plan.opacity) * edgeFade)
        heart.style.transform = `translate3d(${Math.round(x + offsetX)}px, ${Math.round(y + offsetY)}px, 0) rotate(${rotation.toFixed(2)}deg) scale(${pulse.toFixed(3)})`
      }
      root.dataset.state = anyActive ? "active" : "waiting"
      frame = window.requestAnimationFrame(tick)
    }

    const start = () => {
      window.cancelAnimationFrame(frame)
      if (document.hidden || reducedMotion.matches) return
      frame = window.requestAnimationFrame(tick)
    }
    const handleVisibility = () => {
      const now = performance.now()
      if (document.hidden) {
        hiddenAt = now
        root.dataset.paused = "true"
      } else {
        if (hiddenAt !== null) {
          const pauseDuration = now - hiddenAt
          runtimes = runtimes.map((runtime) => ({ ...runtime, startAt: runtime.startAt + pauseDuration }))
        }
        hiddenAt = null
        root.dataset.paused = "false"
      }
      start()
    }
    const handlePointer = (event: PointerEvent) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
    }
    const handleMediaChange = () => {
      configure(performance.now())
      start()
    }

    configure(performance.now())
    window.addEventListener("pointermove", handlePointer, { passive: true })
    window.addEventListener("resize", handleMediaChange, { passive: true })
    document.addEventListener("visibilitychange", handleVisibility)
    reducedMotion.addEventListener("change", handleMediaChange)
    start()
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", handlePointer)
      window.removeEventListener("resize", handleMediaChange)
      document.removeEventListener("visibilitychange", handleVisibility)
      reducedMotion.removeEventListener("change", handleMediaChange)
    }
  }, [preferences, random])

  return <div aria-hidden="true" className="pixel-heart-drift" data-testid="pixel-heart-drift" ref={rootRef}>
    {Array.from({ length: MAX_DESKTOP_PIXEL_HEARTS }, (_, index) => <span className="pixel-heart-float" data-pixel-heart key={index}>
      <svg aria-hidden="true" shapeRendering="crispEdges" viewBox="0 0 32 28">
        <path className="pixel-heart-float__shadow" d="M4 7h3V4h7v3h4V4h7v3h3v9h-3v4h-3v3h-3v3h-4v-3h-3v-3H7v-4H4z" />
        <path className="pixel-heart-float__body" d="M3 6h3V3h8v3h4V3h8v3h3v10h-3v4h-4v4h-3v3h-4v-3h-3v-4H7v-4H3z" />
        <path className="pixel-heart-float__highlight" d="M7 6h6v2H7zM5 8h2v5H5z" />
        <path className="pixel-heart-float__cut" d="M23 7h2v2h-2z" />
      </svg>
    </span>)}
  </div>
}
