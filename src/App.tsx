import { useState } from "react"

import { AppShell, type PrimaryPage } from "@/components/layout/AppShell"
import { ProfilePage } from "@/pages/ProfilePage"
import { StatisticsPage } from "@/pages/StatisticsPage"
import { TimetablePage } from "@/pages/TimetablePage"
import { TodoPage } from "@/pages/TodoPage"

export default function App() {
  const [activePage, setActivePage] = useState<PrimaryPage>("timetable")

  const content =
    activePage === "timetable" ? (
      <TimetablePage onOpenTodos={() => setActivePage("todo")} />
    ) : activePage === "todo" ? (
      <TodoPage />
    ) : activePage === "statistics" ? (
      <StatisticsPage />
    ) : (
      <ProfilePage />
    )

  return (
    <AppShell activePage={activePage} onPageChange={setActivePage}>
      {content}
    </AppShell>
  )
}
