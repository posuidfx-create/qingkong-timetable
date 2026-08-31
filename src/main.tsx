import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import "./index.css"
import { I18nProvider } from "@/i18n/I18nProvider"

const rootElement = document.getElementById("root")
const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches

document.documentElement.classList.toggle("dark", prefersDarkMode)
document
  .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  ?.setAttribute("content", prefersDarkMode ? "#1d211e" : "#f7f7f3")

if (!rootElement) {
  throw new Error("无法找到应用根节点")
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider><App /></I18nProvider>
  </StrictMode>,
)
