import { useEffect, useRef, useState } from "react"
import { Sparkles } from "lucide-react"

import { PixelMotionSettingsPanel } from "@/components/pixel/PixelMotionSettingsPanel"
import { useI18n } from "@/i18n/useI18n"

export function PixelMotionMenu() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  return <div className="pixel-motion-menu relative hidden md:block" ref={rootRef}>
    <button aria-controls="pixel-motion-popover" aria-expanded={open} aria-label={t("pixelMotion.title")} className="workspace-utility-button px-3" onClick={() => setOpen((current) => !current)} type="button"><Sparkles aria-hidden="true" className="size-4" /><span className="hidden xl:inline">{t("pixelMotion.title")}</span></button>
    {open && <div className="pixel-motion-popover" id="pixel-motion-popover" role="dialog" aria-label={t("pixelMotion.title")}><PixelMotionSettingsPanel mode="desktop" /></div>}
  </div>
}
