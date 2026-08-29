import type { ReactNode } from "react"
import {
  CalendarDays,
  ListTodo,
  MessageCircle,
  UserRound,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

export type PrimaryPage = "timetable" | "chat" | "todo" | "statistics" | "profile" | "changelog"

interface AppShellProps {
  activePage: PrimaryPage
  children: ReactNode
  onPageChange: (page: PrimaryPage) => void
  unreadChatCount?: number
  todoBadgeCount?: number
}

interface NavigationItem {
  id: PrimaryPage
  label: string
  icon: LucideIcon
}

const navigationItems: readonly NavigationItem[] = [
  { id: "timetable", label: "课程表", icon: CalendarDays },
  { id: "chat", label: "聊天", icon: MessageCircle },
  { id: "todo", label: "待办", icon: ListTodo },
  { id: "profile", label: "我的", icon: UserRound },
]

export function AppShell({ activePage, children, onPageChange, unreadChatCount = 0, todoBadgeCount = 0 }: AppShellProps) {
  const pageTitle: Record<PrimaryPage, string> = { timetable: "课程表", chat: "聊天", todo: "待办", statistics: "统计", profile: "我的", changelog: "更新日志" }
  return (
    <div className="app-viewport">
      <div className={cn("app-shell", activePage === "timetable" && "app-shell--timetable")}>
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background px-4 py-2 sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium tracking-wide text-muted-foreground">国际教育学院 · 校园小助手</p>
            <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight">{pageTitle[activePage]}</h1>
          </div>
          <ThemeToggle />
        </header>

        <main
          id="app-content"
          className={cn(
            "flex-1",
            activePage === "timetable" ? "pb-5" : "px-4 py-5 sm:px-5",
          )}
        >
          {children}
        </main>

        <nav
          aria-label="主要页面"
          className="app-bottom-nav sticky bottom-0 z-10 grid grid-cols-4 gap-1 border-t bg-background px-2 pt-2"
        >
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activePage === item.id

            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-12 min-w-0 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-[15px] px-1 text-[11px] font-medium transition-all duration-150 active:scale-[0.97]",
                  isActive
                    ? "bg-primary/12 text-primary shadow-xs"
                    : "text-muted-foreground active:bg-muted active:text-foreground",
                )}
                onClick={() => onPageChange(item.id)}
              >
                <span className="relative"><Icon aria-hidden="true" className="size-5" strokeWidth={isActive ? 2.25 : 1.8} />{item.id === "chat" && unreadChatCount > 0 && <span aria-label={`${unreadChatCount} 条未读私聊`} className="absolute -top-1.5 -right-2 min-w-4 rounded-full bg-destructive px-1 text-center text-[9px] leading-4 text-destructive-foreground">{unreadChatCount > 99 ? "99+" : unreadChatCount}</span>}{item.id === "todo" && todoBadgeCount > 0 && <span aria-label={`${todoBadgeCount} 项未完成管理员待办`} className="absolute -top-1.5 -right-2 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] leading-4 text-primary-foreground">{todoBadgeCount > 99 ? "99+" : todoBadgeCount}</span>}</span>
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
