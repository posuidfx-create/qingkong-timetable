import { lazy, Suspense, useCallback, useEffect, useState } from "react"

import { AppShell, type PrimaryPage } from "@/components/layout/AppShell"
import { PwaUpdatePrompt } from "@/components/layout/PwaUpdatePrompt"
import { MajorUpdatePrompt } from "@/components/layout/MajorUpdatePrompt"
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
import { LearningPage } from "@/pages/LearningPage"
import { AboutPage } from "@/pages/AboutPage"
import { getPrimaryPageFromPath, primaryPagePaths } from "@/lib/appNavigation"
import { useI18n } from "@/i18n/useI18n"
const ChatPage = lazy(() => import("@/pages/ChatPage").then((module) => ({ default: module.ChatPage })))
const TodoPage = lazy(() => import("@/pages/TodoPage").then((module) => ({ default: module.TodoPage })))

export default function App() {
  const { t } = useI18n()
  const [activePage, setActivePage] = useState<PrimaryPage>(() => getPrimaryPageFromPath(window.location.pathname))
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
  const handlePageChange = useCallback((page: PrimaryPage) => {
    setActivePage(page)
    const path = primaryPagePaths[page]
    if (window.location.pathname !== path) window.history.pushState(null, "", path)
  }, [])
  useEffect(() => {
    const handlePopState = () => setActivePage(getPrimaryPageFromPath(window.location.pathname))
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const authScreen = getAuthScreen(status, user)
  if (authScreen === "loading") {
    return <main className="flex min-h-[100dvh] items-center justify-center bg-background p-6 text-sm text-muted-foreground">{t("auth.preparing")}</main>
  }
  if (authScreen === "unavailable") {
    return <main className="flex min-h-[100dvh] items-center justify-center bg-background p-4"><section className="w-full max-w-sm rounded-[28px] border bg-card p-6 shadow-sm"><h1 className="text-xl font-semibold">{t("auth.notConfigured")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("auth.notConfiguredDescription")}</p></section></main>
  }
  if (authScreen === "auth") {
    return <>{error && <div className="sr-only" role="alert">{error}</div>}{authMode === "login" ? <LoginPage onRegister={() => setAuthMode("register")} /> : <RegisterPage onLogin={() => setAuthMode("login")} />}</>
  }

  const content =
    activePage === "timetable" ? (
      <TimetablePage onOpenLearning={() => handlePageChange("learning")} onOpenTodos={() => handlePageChange("todo")} />
    ) : activePage === "learning" ? (
      <LearningPage />
    ) : activePage === "chat" ? (
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t("auth.openingChat")}</p>}><ChatPage onlineUsers={onlineUsers} onUnreadHandled={handleUnreadHandled} /></Suspense>
    ) : activePage === "todo" ? (
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t("auth.openingTodo")}</p>}><TodoPage /></Suspense>
    ) : activePage === "statistics" ? (
      <StatisticsPage />
    ) : activePage === "changelog" ? (
      <ChangelogPage onBack={() => handlePageChange("profile")} />
    ) : activePage === "about" ? (
      <AboutPage />
    ) : (
      <ProfilePage onOpenAbout={() => handlePageChange("about")} onOpenChangelog={() => handlePageChange("changelog")} onOpenStatistics={() => handlePageChange("statistics")} />
    )

  return <><AppShell activePage={activePage} onPageChange={handlePageChange} todoBadgeCount={todoBadgeCount} unreadChatCount={unreadChatCount}>
    {content}
    <CohortYearSheet open={profile?.identityType === null} onOpenChange={() => undefined} required />
  </AppShell><MajorUpdatePrompt onViewUpdates={() => handlePageChange("changelog")} /><PwaUpdatePrompt /></>
}
