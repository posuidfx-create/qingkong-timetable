import type { ReactNode } from "react"
import {
  CalendarDays,
  ListTodo,
  MessageCircle,
  UserRound,
  type LucideIcon,
} from "lucide-react"

import { CohortBadge } from "@/components/shared/CohortBadge"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"

export type PrimaryPage = "timetable" | "chat" | "todo" | "statistics" | "profile" | "changelog"

interface AppShellProps {
  activePage: PrimaryPage
  children: ReactNode
  onPageChange: (page: PrimaryPage) => void
  unreadChatCount?: number
  todoBadgeCount?: number
}

interface NavigationItem {
  id: Extract<PrimaryPage, "timetable" | "chat" | "todo" | "profile">
  label: string
  icon: LucideIcon
}

const navigationItems: readonly NavigationItem[] = [
  { id: "timetable", label: "课程表", icon: CalendarDays },
  { id: "chat", label: "聊天", icon: MessageCircle },
  { id: "todo", label: "待办", icon: ListTodo },
  { id: "profile", label: "我的", icon: UserRound },
]

function NavigationBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return <span className="absolute -top-1.5 -right-2 min-w-4 rounded-full bg-destructive px-1 text-center text-[9px] leading-4 text-destructive-foreground">{count > 99 ? "99+" : count}</span>
}

export function AppShell({ activePage, children, onPageChange, unreadChatCount = 0, todoBadgeCount = 0 }: AppShellProps) {
  const profile = useAuthStore((state) => state.profile)
  const pageTitle: Record<PrimaryPage, string> = { timetable: "课程表", chat: "聊天", todo: "待办", statistics: "统计", profile: "我的", changelog: "更新日志" }
  const getBadgeCount = (id: NavigationItem["id"]) => id === "chat" ? unreadChatCount : id === "todo" ? todoBadgeCount : 0

  return (
    <div className="app-viewport">
      <div className={cn("app-shell", activePage === "timetable" && "app-shell--timetable")}>
        <aside className="app-sidebar hidden md:flex" aria-label="桌面导航">
          <div className="px-4 pt-6">
            <p className="text-lg font-semibold tracking-tight">晴空课表</p>
            <p className="mt-1 text-xs text-muted-foreground">国际教育学院</p>
          </div>
          <nav className="mt-8 space-y-1 px-3" aria-label="主要页面">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = activePage === item.id
              const badgeCount = getBadgeCount(item.id)
              return <button key={item.id} type="button" aria-current={isActive ? "page" : undefined} className={cn("flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60", isActive ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted/75 hover:text-foreground")} onClick={() => onPageChange(item.id)}><span className="relative"><Icon aria-hidden="true" className="size-5" strokeWidth={isActive ? 2.25 : 1.8} /><NavigationBadge count={badgeCount} /></span>{item.label}</button>
            })}
          </nav>
          {profile && <div className="mt-auto border-t p-3"><div className="flex items-center gap-2 rounded-2xl bg-muted/45 p-2"><UserAvatar id={profile.id} name={profile.username} className="size-9 rounded-xl text-xs" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{profile.username}</p><CohortBadge year={profile.cohortYear} className="mt-0.5 inline-flex" /></div></div></div>}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background px-4 py-2 sm:px-5 md:px-7">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium tracking-wide text-muted-foreground md:hidden">国际教育学院 · 校园小助手</p>
              <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight">{pageTitle[activePage]}</h1>
            </div>
            <ThemeToggle />
          </header>
          <main id="app-content" className={cn("min-w-0 flex-1", activePage === "timetable" ? "pb-5" : "px-4 py-5 sm:px-5 md:px-7 md:py-7")}>
            {children}
          </main>
          <nav aria-label="主要页面" className="app-bottom-nav sticky bottom-0 z-10 grid grid-cols-4 gap-1 border-t bg-background px-2 pt-2 md:hidden">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = activePage === item.id
              const badgeCount = getBadgeCount(item.id)
              return <button key={item.id} type="button" aria-current={isActive ? "page" : undefined} className={cn("flex min-h-12 min-w-0 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-[15px] px-1 text-[11px] font-medium transition-all duration-150 active:scale-[0.97]", isActive ? "bg-primary/12 text-primary shadow-xs" : "text-muted-foreground active:bg-muted active:text-foreground")} onClick={() => onPageChange(item.id)}><span className="relative"><Icon aria-hidden="true" className="size-5" strokeWidth={isActive ? 2.25 : 1.8} /><NavigationBadge count={badgeCount} /></span><span className="max-w-full truncate">{item.label}</span></button>
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}
