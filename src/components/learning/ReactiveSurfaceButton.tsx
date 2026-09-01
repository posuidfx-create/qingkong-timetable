import { useEffect, useRef, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from "react"

import { resetPixelResponseCells, updatePixelResponseCells } from "@/lib/pixelMotion"
import { cn } from "@/lib/utils"
import { usePixelMotionPreferences } from "@/hooks/usePixelMotionPreferences"

interface ReactiveSurfaceButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function ReactiveSurfaceButton({ children, className, onPointerLeave, onPointerMove, type = "button", ...props }: ReactiveSurfaceButtonProps) {
  const rootRef = useRef<HTMLButtonElement>(null)
  const frameRef = useRef(0)
  const { preferences } = usePixelMotionPreferences()
  useEffect(() => {
    if (!preferences.enabled && rootRef.current) resetPixelResponseCells(rootRef.current)
    return () => window.cancelAnimationFrame(frameRef.current)
  }, [preferences.enabled])

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(event)
    const root = rootRef.current
    if (!root || !preferences.enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const { clientX, clientY } = event
    window.cancelAnimationFrame(frameRef.current)
    frameRef.current = window.requestAnimationFrame(() => updatePixelResponseCells(root, clientX, clientY))
  }

  const handlePointerLeave = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerLeave?.(event)
    window.cancelAnimationFrame(frameRef.current)
    if (rootRef.current) resetPixelResponseCells(rootRef.current)
  }

  return (
    <button className={cn("learning-reactive-surface", className)} data-pixel-motion-enabled={preferences.enabled ? "true" : "false"} onPointerLeave={handlePointerLeave} onPointerMove={handlePointerMove} ref={rootRef} type={type} {...props}>
      <span className="learning-reactive-surface__pixels" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <i data-pixel-cell key={index} />)}</span>
      <span className="learning-reactive-surface__content">{children}</span>
    </button>
  )
}
