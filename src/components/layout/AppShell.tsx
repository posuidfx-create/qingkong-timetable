import { useEffect, useState, type ReactNode } from "react"
import { Info } from "lucide-react"

import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { LanguageMenu } from "@/components/layout/LanguageMenu"
import { CohortBadge } from "@/components/shared/CohortBadge"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { WallpaperLayer } from "@/components/wallpaper/WallpaperLayer"
import { WallpaperMotionButton, WallpaperPicker, WallpaperPickerButton } from "@/components/wallpaper/WallpaperPicker"
import { getWallpaperById, type WallpaperDefinition } from "@/data/wallpapers"
import type { PrimaryPage } from "@/lib/appNavigation"
import { primaryNavigationItems, type NavigationItem } from "@/lib/primaryNavigation"
import { cn } from "@/lib/utils"
import { readWallpaperPreference, saveWallpaperPreference } from "@/lib/wallpaper"
import { applyWallpaperMotionAttributes, readWallpaperMotionPreference, toggleAndSaveWallpaperMotion } from "@/lib/wallpaperMotion"
import { useAuthStore } from "@/store/authStore"
import { useI18n } from "@/i18n/useI18n"

export type { PrimaryPage } from "@/lib/appNavigation"

interface AppShellProps {
  activePage: PrimaryPage
  children: ReactNode
  onPageChange: (page: PrimaryPage) => void
  unreadChatCount?: number
  todoBadgeCount?: number
}

function NavigationBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return <span className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[9px] leading-4 text-destructive-foreground">{count > 99 ? "99+" : count}</span>
}

export function AppShell({ activePage, children, onPageChange, unreadChatCount = 0, todoBadgeCount = 0 }: AppShellProps) {
  const profile = useAuthStore((state) => state.profile)
  const { locale, t } = useI18n()
  const [wallpaper, setWallpaper] = useState(() => getWallpaperById(readWallpaperPreference(typeof window === "undefined" ? undefined : window.localStorage)))
  const [wallpaperPickerOpen, setWallpaperPickerOpen] = useState(false)
  const [wallpaperMotion, setWallpaperMotion] = useState(() => readWallpaperMotionPreference(typeof window === "undefined" ? undefined : window.localStorage))
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  const pageTitle: Record<PrimaryPage, string> = { timetable: t("nav.timetable"), learning: t("nav.learning"), chat: t("nav.chat"), todo: t("nav.todo"), statistics: t("nav.statistics"), profile: t("nav.profile"), changelog: t("nav.changelog"), about: t("nav.about") }
  const getBadgeCount = (id: NavigationItem["id"]) => id === "chat" ? unreadChatCount : id === "todo" ? todoBadgeCount : 0

  useEffect(() => {
    document.documentElement.dataset.wallpaper = wallpaper.id
  }, [wallpaper.id])

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    applyWallpaperMotionAttributes(document.documentElement, wallpaperMotion, reducedMotion)
    return () => {
      delete document.documentElement.dataset.wallpaperMotion
      delete document.documentElement.dataset.reducedMotion
    }
  }, [reducedMotion, wallpaperMotion])

  function handleWallpaperChange(nextWallpaper: WallpaperDefinition) {
    const savedId = saveWallpaperPreference(window.localStorage, nextWallpaper.id)
    setWallpaper(getWallpaperById(savedId))
  }

  function handleToggleWallpaperMotion() {
    if (reducedMotion) return
    setWallpaperMotion((currentMotion) => toggleAndSaveWallpaperMotion(window.localStorage, currentMotion))
  }

  return <div className="app-viewport" data-wallpaper={wallpaper.id} data-wallpaper-motion={wallpaperMotion}>
    <WallpaperLayer motionPreference={wallpaperMotion} wallpaper={wallpaper} />
    <div className="app-shell" data-locale={locale}>
      <aside className="workspace-rail" aria-label={t("nav.timetable")}>
        <button aria-label={t("brand.name")} className="workspace-rail-brand" onClick={() => onPageChange("timetable")} type="button"><span>{t("brand.name").slice(0, 1)}</span></button>
        <nav className="workspace-rail-nav" aria-label={t("nav.primary")}>
          {primaryNavigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activePage === item.id
            const badgeCount = getBadgeCount(item.id)
            return <button key={item.id} type="button" aria-current={isActive ? "page" : undefined} className="workspace-rail-item" data-active={isActive} onClick={() => onPageChange(item.id)}><span className="relative"><Icon aria-hidden="true" className="size-5" strokeWidth={isActive ? 2 : 1.55} /><NavigationBadge count={badgeCount} /></span><span>{t(item.labelKey)}</span></button>
          })}
        </nav>
        {profile && <button className="workspace-rail-profile" onClick={() => onPageChange("profile")} type="button"><UserAvatar id={profile.id} name={profile.username} className="size-9 rounded-full text-xs" /><span className="sr-only">{profile.username}</span></button>}
      </aside>
      <header className="app-page-header sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b px-4 sm:px-5 md:min-h-18 md:px-8">
        <div className="min-w-0 md:hidden">
          <p className="app-mobile-brand-meta truncate font-medium text-muted-foreground">{t("brand.name")}</p>
          <h1 className="app-mobile-page-title truncate font-medium">{pageTitle[activePage]}</h1>
        </div>
        <div className="workspace-brand hidden min-w-0 md:block">
          <p className="truncate text-sm font-medium tracking-tight">{t("brand.name")}</p>
          <p className="mt-0.5 truncate text-[10px] tracking-[0.08em] text-muted-foreground">{t("brand.slogan")}</p>
        </div>
        <div className="hidden min-w-0 flex-1 items-center justify-center md:flex"><p className="truncate text-xs font-medium tracking-[0.08em] text-muted-foreground">{pageTitle[activePage]}</p></div>
        <div className="app-shell-utility ml-auto">
          {profile ? <div className="workspace-user hidden items-center gap-2 lg:flex"><div className="min-w-0 text-right"><p className="truncate text-xs font-medium">{profile.username}</p><CohortBadge year={profile.cohortYear} className="mt-0.5 inline-flex" /></div><UserAvatar id={profile.id} name={profile.username} className="size-8 rounded-full text-xs" /></div> : null}
          <WallpaperMotionButton className="hidden md:inline-flex" motionPreference={wallpaperMotion} reducedMotion={reducedMotion} onToggle={handleToggleWallpaperMotion} />
          <LanguageMenu compact />
          <button aria-label={t("utility.about")} className="workspace-utility-button" onClick={() => onPageChange("about")} type="button"><Info aria-hidden="true" className="size-[18px]" /></button>
          <WallpaperPickerButton onClick={() => setWallpaperPickerOpen(true)} />
          <ThemeToggle />
        </div>
      </header>
      <main id="app-content" className={cn("min-w-0 flex-1", activePage === "timetable" ? "pb-6" : "px-4 py-6 sm:px-5 md:px-8 md:py-8")}>
        <div className={cn("app-page-container", activePage === "timetable" && "app-page-container--timetable")} key={activePage}>{children}</div>
      </main>
      <nav aria-label={t("nav.primary")} className="app-bottom-nav sticky bottom-0 z-30 grid grid-cols-5 gap-1 border-t bg-background px-2 pt-2 md:hidden">
        {primaryNavigationItems.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.id
          const badgeCount = getBadgeCount(item.id)
          return <button key={item.id} type="button" aria-current={isActive ? "page" : undefined} className={cn("app-mobile-nav-item flex min-h-12 min-w-0 touch-manipulation flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium active:scale-[0.98]", isActive ? "text-primary" : "text-muted-foreground active:text-foreground")} data-active={isActive} onClick={() => onPageChange(item.id)}><span className="relative"><Icon aria-hidden="true" className="size-[19px]" strokeWidth={isActive ? 2 : 1.55} /><NavigationBadge count={badgeCount} /></span><span className="max-w-full truncate">{t(item.labelKey)}</span></button>
        })}
      </nav>
    </div>
    <WallpaperPicker currentId={wallpaper.id} motionPreference={wallpaperMotion} onChange={handleWallpaperChange} onOpenChange={setWallpaperPickerOpen} onToggleMotion={handleToggleWallpaperMotion} open={wallpaperPickerOpen} reducedMotion={reducedMotion} />
  </div>
}
