import { useEffect, useRef } from "react"

import { usePixelMotionPreferences } from "@/hooks/usePixelMotionPreferences"
import { createPointerPixelBurst, isPixelDebugMode, isPointerPixelFieldEnabled, readPixelMotionConfig, shouldSamplePointer, type PointerSample } from "@/lib/pixelMotion"

interface PointerPixelFieldProps {
  debugProbe?: boolean
  random?: () => number
}

const INTERACTIVE_SELECTOR = "button, a, input, textarea, select, option, label, form, [role='dialog'], [role='menu'], [contenteditable='true'], [data-radix-popper-content-wrapper]"

export function PointerPixelField({ debugProbe = false, random = Math.random }: PointerPixelFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { preferences } = usePixelMotionPreferences()

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const debug = debugProbe || isPixelDebugMode(window.location.search, import.meta.env.DEV)
    const config = readPixelMotionConfig(window.localStorage, import.meta.env.DEV)
    const timers = new Set<number>()
    let previous: PointerSample | null = null

    const removePixel = (pixel: HTMLElement, timer: number) => {
      window.clearTimeout(timer)
      timers.delete(timer)
      pixel.remove()
    }
    const spawn = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element) || target.closest(INTERACTIVE_SELECTOR)) return
      if (!debug && !target.closest("#app-content")) return
      if (event.pointerType !== "mouse") return
      const enabled = !reducedMotion.matches && (debug || isPointerPixelFieldEnabled(window.innerWidth, false, preferences.enabled))
      if (!enabled) return
      const next = { time: performance.now(), x: event.clientX, y: event.clientY }
      if (!shouldSamplePointer(previous, next, config.pointer)) return
      previous = next
      for (const plan of createPointerPixelBurst(debug ? () => 0.18 : random, config.pointer)) {
        const pixel = document.createElement("i")
        pixel.dataset.pointerPixel = "true"
        pixel.dataset.particleKind = plan.kind
        pixel.style.left = `${event.clientX}px`
        pixel.style.top = `${event.clientY}px`
        const size = plan.kind === "heart" ? Math.max(6, plan.size) : plan.size
        pixel.style.width = `${size.toFixed(2)}px`
        pixel.style.height = `${size.toFixed(2)}px`
        pixel.style.setProperty("--pixel-burst-x", `${plan.offsetX.toFixed(2)}px`)
        pixel.style.setProperty("--pixel-burst-y", `${plan.offsetY.toFixed(2)}px`)
        pixel.style.animationDelay = `${plan.delayMs.toFixed(0)}ms`
        pixel.style.animationDuration = `${plan.durationMs.toFixed(0)}ms`
        root.append(pixel)
        const timer = window.setTimeout(() => removePixel(pixel, timer), plan.delayMs + plan.durationMs + 80)
        timers.add(timer)
      }
    }

    window.addEventListener("pointermove", spawn, { passive: true })
    return () => {
      window.removeEventListener("pointermove", spawn)
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
      root.replaceChildren()
    }
  }, [debugProbe, preferences, random])

  return <div aria-hidden="true" className="pointer-pixel-field" data-debug-probe={debugProbe ? "true" : undefined} ref={rootRef} />
}
