import { useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { useTimetableStore } from "@/store/timetableStore"
import { useI18n } from "@/i18n/useI18n"

const themeColors = {
  dark: "#1d211e",
  light: "#f7f7f3",
} as const

function updateThemeColor(isDark: boolean) {
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  themeColor?.setAttribute("content", isDark ? themeColors.dark : themeColors.light)
}

export function ThemeToggle() {
  const { t } = useI18n()
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
      aria-label={t(isDark ? "theme.toLight" : "theme.toDark")}
      className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.98] active:text-foreground"
      onClick={toggleTheme}
    >
      <Icon aria-hidden="true" className="size-[18px]" />
    </button>
  )
}
