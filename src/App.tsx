import { lazy, Suspense, useCallback, useState } from "react"

import { AppShell, type PrimaryPage } from "@/components/layout/AppShell"
import { useAuthSession } from "@/hooks/useAuthSession"
import { useOnlinePresence } from "@/hooks/useOnlinePresence"
import { usePrivateUnreadCount } from "@/hooks/usePrivateUnreadCount"
import { useAdminTodoBadge } from "@/hooks/useAdminTodoBadge"
import { getAuthScreen } from "@/lib/auth"
import { useAuthStore } from "@/store/authStore"
import { LoginPage } from "@/pages/LoginPage"
import { CohortYearSheet } from "@/components/profile/CohortYearSheet"
import { ProfilePage } from "@/pages/ProfilePage"
import { RegisterPage } from "@/pages/RegisterPage"
import { StatisticsPage } from "@/pages/StatisticsPage"
import { TimetablePage } from "@/pages/TimetablePage"
import { ChangelogPage } from "@/pages/ChangelogPage"
const ChatPage = lazy(() => import("@/pages/ChatPage").then((module) => ({ default: module.ChatPage })))
const TodoPage = lazy(() => import("@/pages/TodoPage").then((module) => ({ default: module.TodoPage })))

export default function App() {
  const [activePage, setActivePage] = useState<PrimaryPage>("timetable")
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const error = useAuthStore((state) => state.error)
  useAuthSession()
  const profile = useAuthStore((state) => state.profile)
  const onlineUsers = useOnlinePresence(profile)
  const { count: unreadChatCount, refresh: refreshUnreadChatCount } = usePrivateUnreadCount(user?.id)
  const todoBadgeCount = useAdminTodoBadge(profile, user?.id)
  const handleUnreadHandled = useCallback(() => refreshUnreadChatCount(), [refreshUnreadChatCount])

  const authScreen = getAuthScreen(status, user)
  if (authScreen === "loading") {
    return <main className="flex min-h-[100dvh] items-center justify-center bg-background p-6 text-sm text-muted-foreground">正在准备晴空课表…</main>
  }
  if (authScreen === "unavailable") {
    return <main className="flex min-h-[100dvh] items-center justify-center bg-background p-4"><section className="w-full max-w-sm rounded-[28px] border bg-card p-6 shadow-sm"><h1 className="text-xl font-semibold">账户服务尚未配置</h1><p className="mt-2 text-sm text-muted-foreground">请在部署平台配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY，然后重新部署。</p></section></main>
  }
  if (authScreen === "auth") {
    return <>{error && <div className="sr-only" role="alert">{error}</div>}{authMode === "login" ? <LoginPage onRegister={() => setAuthMode("register")} /> : <RegisterPage onLogin={() => setAuthMode("login")} />}</>
  }

  const content =
    activePage === "timetable" ? (
      <TimetablePage onOpenTodos={() => setActivePage("todo")} />
    ) : activePage === "chat" ? (
      <Suspense fallback={<p className="text-sm text-muted-foreground">正在打开聊天…</p>}><ChatPage onlineUsers={onlineUsers} onUnreadHandled={handleUnreadHandled} /></Suspense>
    ) : activePage === "todo" ? (
      <Suspense fallback={<p className="text-sm text-muted-foreground">正在打开待办…</p>}><TodoPage /></Suspense>
    ) : activePage === "statistics" ? (
      <StatisticsPage />
    ) : activePage === "changelog" ? (
      <ChangelogPage onBack={() => setActivePage("profile")} />
    ) : (
      <ProfilePage onOpenChangelog={() => setActivePage("changelog")} onOpenStatistics={() => setActivePage("statistics")} />
    )

  return (
    <AppShell activePage={activePage} onPageChange={setActivePage} todoBadgeCount={todoBadgeCount} unreadChatCount={unreadChatCount}>
      {content}
      <CohortYearSheet open={profile?.cohortYear === null} onOpenChange={() => undefined} required />
    </AppShell>
  )
}
