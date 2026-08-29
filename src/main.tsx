import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import "./index.css"

const rootElement = document.getElementById("root")
const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches

document.documentElement.classList.toggle("dark", prefersDarkMode)
document
  .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  ?.setAttribute("content", prefersDarkMode ? "#292322" : "#fffdf8")

if (!rootElement) {
  throw new Error("无法找到应用根节点")
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
