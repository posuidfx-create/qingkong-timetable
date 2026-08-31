import { Check, Image as ImageIcon, Pause, Play } from "lucide-react"

import { wallpapers, type WallpaperDefinition } from "@/data/wallpapers"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { WallpaperMotionPreference } from "@/lib/wallpaperMotion"
import { useI18n } from "@/i18n/useI18n"

interface WallpaperPickerProps {
  currentId: string
  onChange: (wallpaper: WallpaperDefinition) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  motionPreference: WallpaperMotionPreference
  reducedMotion: boolean
  onToggleMotion: () => void
}

interface WallpaperMotionButtonProps {
  motionPreference: WallpaperMotionPreference
  reducedMotion: boolean
  onToggle: () => void
  className?: string
}

export function WallpaperMotionButton({ motionPreference, reducedMotion, onToggle, className }: WallpaperMotionButtonProps) {
  const { t } = useI18n()
  const paused = motionPreference === "paused"
  const label = t(reducedMotion ? "wallpaper.reduced" : paused ? "wallpaper.resumeBackground" : "wallpaper.pauseBackground")
  const Icon = paused ? Play : Pause

  return <Button aria-label={label} className={`wallpaper-motion-button ${className ?? ""}`} disabled={reducedMotion} onClick={onToggle} size="icon" title={label} type="button" variant="ghost"><Icon aria-hidden="true" /></Button>
}

export function WallpaperPicker({ currentId, onChange, open, onOpenChange, motionPreference, reducedMotion, onToggleMotion }: WallpaperPickerProps) {
  const { t } = useI18n()
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="wallpaper-picker">
      <SheetHeader><SheetTitle>{t("wallpaper.title")}</SheetTitle><SheetDescription>{t("wallpaper.description")}</SheetDescription></SheetHeader>
      <div className="grid gap-2 px-4 pb-5">
        <div className="wallpaper-motion-control"><div><p className="text-sm font-medium">{t("wallpaper.motion")}</p><p className="mt-0.5 text-xs text-muted-foreground">{t(reducedMotion ? "wallpaper.reduced" : motionPreference === "paused" ? "wallpaper.paused" : "wallpaper.playing")}</p></div><WallpaperMotionButton motionPreference={motionPreference} reducedMotion={reducedMotion} onToggle={onToggleMotion} /></div>
        {wallpapers.map((wallpaper) => <button aria-pressed={wallpaper.id === currentId} className="wallpaper-choice" data-wallpaper={wallpaper.id} key={wallpaper.id} onClick={() => { onChange(wallpaper); onOpenChange(false) }} type="button"><span className="wallpaper-choice-preview" style={wallpaper.id === "water-01" ? { backgroundImage: `url(${wallpaper.fallbackSrc})` } : wallpaper.type === "video" && wallpaper.poster ? { backgroundImage: `url(${wallpaper.poster})` } : undefined} /><span className="min-w-0 text-left"><span className="block text-sm font-medium">{wallpaper.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{t(wallpaper.id === "water-01" ? "wallpaper.surface" : wallpaper.type === "css" ? "wallpaper.css" : wallpaper.type === "video" ? "wallpaper.video" : "wallpaper.static")}</span></span><span className="ml-auto flex size-6 items-center justify-center text-primary">{wallpaper.id === currentId ? <Check aria-label={t("wallpaper.current")} className="size-4" /> : null}</span></button>)}
      </div>
    </SheetContent>
  </Sheet>
}

export function WallpaperPickerButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return <Button aria-label={t("wallpaper.switch")} onClick={onClick} size="icon" title={t("wallpaper.switch")} type="button" variant="ghost"><ImageIcon className="size-[18px]" /></Button>
}
