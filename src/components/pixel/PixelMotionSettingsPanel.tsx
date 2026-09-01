import { useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"

import { Switch } from "@/components/ui/switch"
import { usePixelMotionPreferences } from "@/hooks/usePixelMotionPreferences"
import { useI18n } from "@/i18n/useI18n"
import { PIXEL_MOTION_LIMITS, type PixelMotionPreferences } from "@/lib/pixelMotion"

interface MotionRangeProps {
  label: string
  maximum: number
  minimum: number
  onChange: (value: number) => void
  suffix?: string
  value: number
}

function MotionRange({ label, maximum, minimum, onChange, suffix = "", value }: MotionRangeProps) {
  return <label className="pixel-motion-range">
    <span><span>{label}</span><output>{value}{suffix}</output></span>
    <input aria-label={label} max={maximum} min={minimum} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} step="1" type="range" value={value} />
  </label>
}

interface PixelMotionSettingsPanelProps {
  mode?: "desktop" | "mobile"
}

export function PixelMotionSettingsPanel({ mode = "desktop" }: PixelMotionSettingsPanelProps) {
  const { t } = useI18n()
  const { preferences, resetPreferences, updatePreferences } = usePixelMotionPreferences()
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  const updateNumber = (key: keyof Pick<PixelMotionPreferences, "desktopBackgroundCount" | "mobileBackgroundCount" | "backgroundSizePx" | "speed" | "backgroundOpacity" | "pointerCount" | "pointerSizePx" | "touchParticleCount" | "touchParticleSizePx">) => (value: number) => updatePreferences({ [key]: value })
  const countKey = mode === "mobile" ? "mobileBackgroundCount" : "desktopBackgroundCount"
  const countLimit = mode === "mobile" ? PIXEL_MOTION_LIMITS.mobileBackgroundCount : PIXEL_MOTION_LIMITS.desktopBackgroundCount

  return <div className="pixel-motion-settings" data-testid="pixel-motion-settings">
    <div className="pixel-motion-settings__toggle">
      <div><strong>{t("pixelMotion.title")}</strong><span>{preferences.enabled ? t("pixelMotion.on") : t("pixelMotion.off")}</span></div>
      <Switch aria-label={t("pixelMotion.toggle")} checked={preferences.enabled} onCheckedChange={(enabled) => updatePreferences({ enabled })} />
    </div>

    {reducedMotion && <p className="pixel-motion-settings__notice" role="status">{t("pixelMotion.reducedMotion")}</p>}

    <fieldset disabled={!preferences.enabled}>
      <legend>{t("pixelMotion.backgroundHearts")}</legend>
      <MotionRange label={t("pixelMotion.count")} minimum={countLimit.minimum} maximum={countLimit.maximum} value={preferences[countKey]} onChange={updateNumber(countKey)} />
      <MotionRange label={t("pixelMotion.size")} minimum={PIXEL_MOTION_LIMITS.backgroundSizePx.minimum} maximum={PIXEL_MOTION_LIMITS.backgroundSizePx.maximum} suffix=" px" value={preferences.backgroundSizePx} onChange={updateNumber("backgroundSizePx")} />
      <MotionRange label={t("pixelMotion.speed")} minimum={PIXEL_MOTION_LIMITS.speed.minimum} maximum={PIXEL_MOTION_LIMITS.speed.maximum} value={preferences.speed} onChange={updateNumber("speed")} />
      <div className="pixel-motion-speed-labels"><span>{t("pixelMotion.slow")}</span><span>{t("pixelMotion.fast")}</span></div>
      <MotionRange label={t("pixelMotion.opacity")} minimum={PIXEL_MOTION_LIMITS.backgroundOpacity.minimum} maximum={PIXEL_MOTION_LIMITS.backgroundOpacity.maximum} suffix="%" value={preferences.backgroundOpacity} onChange={updateNumber("backgroundOpacity")} />
    </fieldset>

    {mode === "desktop" ? <fieldset disabled={!preferences.enabled}>
      <legend>{t("pixelMotion.pointerParticles")}</legend>
      <MotionRange label={t("pixelMotion.count")} minimum={PIXEL_MOTION_LIMITS.pointerCount.minimum} maximum={PIXEL_MOTION_LIMITS.pointerCount.maximum} value={preferences.pointerCount} onChange={updateNumber("pointerCount")} />
      <MotionRange label={t("pixelMotion.size")} minimum={PIXEL_MOTION_LIMITS.pointerSizePx.minimum} maximum={PIXEL_MOTION_LIMITS.pointerSizePx.maximum} suffix=" px" value={preferences.pointerSizePx} onChange={updateNumber("pointerSizePx")} />
    </fieldset> : <fieldset disabled={!preferences.enabled}>
      <legend>{t("pixelMotion.touchParticles")}</legend>
      <div className="pixel-motion-settings__subtoggle"><span>{t("pixelMotion.touchParticles")}</span><Switch aria-label={t("pixelMotion.touchToggle")} checked={preferences.touchEffectsEnabled} onCheckedChange={(touchEffectsEnabled) => updatePreferences({ touchEffectsEnabled })} /></div>
      <div aria-disabled={!preferences.touchEffectsEnabled} className="pixel-motion-settings__touch-controls">
        <MotionRange label={t("pixelMotion.count")} minimum={PIXEL_MOTION_LIMITS.touchParticleCount.minimum} maximum={PIXEL_MOTION_LIMITS.touchParticleCount.maximum} value={preferences.touchParticleCount} onChange={updateNumber("touchParticleCount")} />
        <MotionRange label={t("pixelMotion.size")} minimum={PIXEL_MOTION_LIMITS.touchParticleSizePx.minimum} maximum={PIXEL_MOTION_LIMITS.touchParticleSizePx.maximum} suffix=" px" value={preferences.touchParticleSizePx} onChange={updateNumber("touchParticleSizePx")} />
      </div>
    </fieldset>}

    <button className="pixel-motion-settings__reset" onClick={resetPreferences} type="button"><RotateCcw aria-hidden="true" className="size-3.5" />{t("pixelMotion.reset")}</button>
  </div>
}
