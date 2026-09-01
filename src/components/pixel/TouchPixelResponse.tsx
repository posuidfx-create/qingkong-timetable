import { useEffect, useRef } from "react"

import { usePixelMotionPreferences } from "@/hooks/usePixelMotionPreferences"
import {
  createTouchPixelBurst,
  isTouchPixelResponseEnabled,
  isTouchPixelTargetAllowed,
  readPixelMotionConfig,
} from "@/lib/pixelMotion"

interface TouchPixelResponseProps {
  random?: () => number
}

export function TouchPixelResponse({ random = Math.random }: TouchPixelResponseProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { preferences } = usePixelMotionPreferences()

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const config = readPixelMotionConfig(window.localStorage, import.meta.env.DEV)
    const timers = new Set<number>()
    let spawnCount = 0
    if (import.meta.env.DEV) root.dataset.spawnCount = "0"

    const removeParticle = (particle: HTMLElement, timer: number) => {
      window.clearTimeout(timer)
      timers.delete(timer)
      particle.remove()
    }

    const enforceHardCap = () => {
      while (root.childElementCount >= config.touch.maxActiveParticles) root.firstElementChild?.remove()
    }

    const spawn = (event: PointerEvent) => {
      if (!isTouchPixelResponseEnabled(event.pointerType, reducedMotion.matches, preferences)) return
      if (!isTouchPixelTargetAllowed(event.target)) return
      const target = event.target as Element
      if (!target.closest("#app-content, [data-pixel-motion-touch-surface]")) return
      spawnCount += 1
      if (import.meta.env.DEV) root.dataset.spawnCount = String(spawnCount)

      for (const plan of createTouchPixelBurst(random, config.touch)) {
        enforceHardCap()
        const particle = document.createElement("i")
        particle.dataset.touchPixel = "true"
        particle.dataset.particleKind = plan.kind
        particle.style.left = `${event.clientX}px`
        particle.style.top = `${event.clientY}px`
        const size = plan.kind === "heart" ? Math.max(7, plan.size) : plan.size
        particle.style.width = `${size.toFixed(2)}px`
        particle.style.height = `${size.toFixed(2)}px`
        particle.style.setProperty("--pixel-burst-x", `${plan.offsetX.toFixed(2)}px`)
        particle.style.setProperty("--pixel-burst-y", `${plan.offsetY.toFixed(2)}px`)
        particle.style.animationDelay = `${plan.delayMs.toFixed(0)}ms`
        particle.style.animationDuration = `${plan.durationMs.toFixed(0)}ms`
        root.append(particle)
        const timer = window.setTimeout(() => removeParticle(particle, timer), plan.delayMs + plan.durationMs + 80)
        timers.add(timer)
      }
    }

    window.addEventListener("pointerdown", spawn, { passive: true })
    return () => {
      window.removeEventListener("pointerdown", spawn)
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
      root.replaceChildren()
    }
  }, [preferences, random])

  return <div aria-hidden="true" className="touch-pixel-response" data-testid="touch-pixel-response" ref={rootRef} />
}
