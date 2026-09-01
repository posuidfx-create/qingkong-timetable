import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import "./index.css"
import { I18nProvider } from "@/i18n/I18nProvider"
import { cleanupLegacyWallpaperPreferences } from "@/lib/legacyPreferences"
import { PixelMotionDebugProbe } from "@/components/pixel/PixelMotionDebugProbe"

const rootElement = document.getElementById("root")
const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches

document.documentElement.classList.toggle("dark", prefersDarkMode)
document
  .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  ?.setAttribute("content", prefersDarkMode ? "#171717" : "#f5f5f5")

if (!rootElement) {
  throw new Error("无法找到应用根节点")
}

cleanupLegacyWallpaperPreferences(window.localStorage)

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider>{import.meta.env.DEV ? <PixelMotionDebugProbe /> : null}<App /></I18nProvider>
  </StrictMode>,
)
