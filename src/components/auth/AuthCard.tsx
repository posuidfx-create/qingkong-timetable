import type { ReactNode } from "react"
import { BookOpen, GraduationCap } from "lucide-react"

import { LanguageMenu } from "@/components/layout/LanguageMenu"
import { useI18n } from "@/i18n/useI18n"
import { WallpaperLayer } from "@/components/wallpaper/WallpaperLayer"
import { getWallpaperById } from "@/data/wallpapers"
import { readWallpaperPreference } from "@/lib/wallpaper"
import { readWallpaperMotionPreference } from "@/lib/wallpaperMotion"

export function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const { t } = useI18n()
  const storage = typeof window === "undefined" ? undefined : window.localStorage
  const wallpaper = getWallpaperById(readWallpaperPreference(storage))
  const motionPreference = readWallpaperMotionPreference(storage)
  return <main className="auth-water-room flex min-h-[100dvh] items-center justify-center p-4"><WallpaperLayer motionPreference={motionPreference} wallpaper={wallpaper} /><section className="auth-glass-window relative w-full max-w-sm rounded-[28px] border p-6" aria-labelledby="auth-title"><div className="absolute right-4 top-4"><LanguageMenu compact /></div><div className="flex items-center gap-3 pr-11"><div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><BookOpen className="size-6" /></div><div className="min-w-0"><p className="truncate text-lg font-semibold tracking-tight">{t("brand.name")}</p><p className="truncate text-xs text-muted-foreground">{t("brand.slogan")}</p></div></div><div className="mt-6 border-l-2 border-primary/35 pl-3"><p className="flex items-center gap-1.5 text-xs font-medium text-foreground"><GraduationCap className="size-3.5 text-primary" />{t("institution.name")}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{t("institution.college")}</p></div><h1 id="auth-title" className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>{children}</section></main>
}
