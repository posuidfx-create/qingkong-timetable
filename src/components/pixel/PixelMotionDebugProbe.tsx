import { PixelHeartDrift } from "@/components/pixel/PixelHeartDrift"
import { PointerPixelField } from "@/components/pixel/PointerPixelField"
import { TouchPixelResponse } from "@/components/pixel/TouchPixelResponse"
import { PixelMotionSettingsPanel } from "@/components/pixel/PixelMotionSettingsPanel"
import { ReactiveSurfaceButton } from "@/components/learning/ReactiveSurfaceButton"
import { isPixelDebugMode } from "@/lib/pixelMotion"
import { usePixelMotionPreferences } from "@/hooks/usePixelMotionPreferences"

function PixelMotionDebugControls() {
  const { updatePreferences } = usePixelMotionPreferences()
  const dispatchTouch = (selector: string) => {
    document.querySelector(selector)?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 18, clientY: 420, pointerType: "touch" }))
  }
  return <div className="pixel-debug-presets" aria-label="Pixel Motion QA presets">
    {[0, 1, 3, 5].map((value) => <button key={`count-${value}`} onClick={() => updatePreferences({ mobileBackgroundCount: value })} type="button">C{value}</button>)}
    {[16, 26, 36].map((value) => <button key={`size-${value}`} onClick={() => updatePreferences({ backgroundSizePx: value })} type="button">S{value}</button>)}
    {[0, 35, 100].map((value) => <button key={`speed-${value}`} onClick={() => updatePreferences({ speed: value })} type="button">V{value}</button>)}
    {[25, 45, 65].map((value) => <button key={`opacity-${value}`} onClick={() => updatePreferences({ backgroundOpacity: value })} type="button">O{value}</button>)}
    <button onClick={() => dispatchTouch("[data-pixel-motion-touch-surface]")} type="button">TAP</button>
    <button onClick={() => dispatchTouch(".pixel-motion-range input")} type="button">CONTROL</button>
  </div>
}

export function PixelMotionDebugProbe() {
  if (!isPixelDebugMode(window.location.search, import.meta.env.DEV)) return null
  return <div data-pixel-debug-probe="true"><PixelHeartDrift /><PointerPixelField debugProbe /><TouchPixelResponse /><main className="pixel-debug-touch-surface" data-pixel-motion-touch-surface><p>PIXEL MOTION PREVIEW</p></main><aside className="pixel-debug-cta-probe"><small>PIXEL MOTION DEBUG</small><ReactiveSurfaceButton>记录今天</ReactiveSurfaceButton><PixelMotionDebugControls /><div className="pixel-debug-motion-settings"><PixelMotionSettingsPanel mode="mobile" /></div></aside></div>
}
