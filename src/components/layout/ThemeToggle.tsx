import { useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { useTimetableStore } from "@/store/timetableStore"

const themeColors = {
  dark: "#292322",
  light: "#fffdf8",
} as const

function updateThemeColor(isDark: boolean) {
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  themeColor?.setAttribute("content", isDark ? themeColors.dark : themeColors.light)
}

export function ThemeToggle() {
  const theme = useTimetableStore((state) => state.settings.theme)
  const updateSettings = useTimetableStore((state) => state.updateSettings)
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  const Icon = isDark ? Sun : Moon

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
    updateThemeColor(isDark)
  }, [isDark])

  function toggleTheme() {
    const nextIsDark = !isDark
    updateSettings({ theme: nextIsDark ? "dark" : "light" })
  }

  return (
    <button
      type="button"
      aria-label={isDark ? "切换为浅色模式" : "切换为深色模式"}
      className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-muted-foreground transition-colors duration-200 active:bg-muted active:text-foreground"
      onClick={toggleTheme}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  )
}
