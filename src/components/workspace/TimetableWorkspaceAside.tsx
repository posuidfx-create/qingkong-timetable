import { BookOpen, CheckSquare, Sparkles } from "lucide-react"
import { useI18n } from "@/i18n/useI18n"
import type { AppLocale } from "@/i18n/locale"
import { formatTranslation } from "@/i18n/translate"

interface TimetableWorkspaceAsideProps {
  focusedWindow?: "main" | "today" | "learning" | "todo" | "ai"
  onFocus: (window: "today" | "learning" | "todo" | "ai") => void
  onOpenLearning?: () => void
  onOpenVocabulary?: () => void
  onOpenTodos?: () => void
  todayTodoCount: number
}

function getTodayLabel(now: Date, locale: AppLocale): { date: string; day: string; month: string; weekday: string } {
  return {
    day: String(now.getDate()).padStart(2, "0"),
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(now).toUpperCase(),
    weekday: new Intl.DateTimeFormat(locale, { weekday: "long" }).format(now),
    date: new Intl.DateTimeFormat(locale, { month: "long", day: "numeric" }).format(now),
  }
}

export function TimetableWorkspaceAside({ focusedWindow, onFocus, onOpenLearning, onOpenVocabulary, onOpenTodos, todayTodoCount }: TimetableWorkspaceAsideProps) {
  const { locale, t } = useI18n()
  const today = getTodayLabel(new Date(), locale)

  return <aside className="timetable-workspace-aside" aria-label={t("timetable.workspaceAside")}>
    <section className="workspace-window workspace-today-window" data-focused={focusedWindow === "today" || undefined} onClick={() => onFocus("today")}>
      <p className="workspace-window-kicker">TODAY</p>
      <div className="workspace-today-number"><span>{today.day}</span><small>{today.month}</small></div>
      <p className="text-sm text-muted-foreground">{today.date} · {today.weekday}</p>
    </section>

    <section className="workspace-window workspace-learning-window" data-focused={focusedWindow === "learning" || undefined} onClick={() => onFocus("learning")}>
      <div className="flex items-start justify-between gap-3"><div><p className="workspace-window-kicker">LEARNING</p><h3 className="mt-1 text-base font-medium">{t("learning.title")}</h3></div><BookOpen aria-hidden="true" className="size-4 text-primary" /></div>
      <button className="workspace-learning-index mt-4" onClick={(event) => { event.stopPropagation(); onOpenLearning?.() }} type="button"><span>01</span>{t("learning.today")} <i aria-hidden="true">→</i></button>
      <button className="workspace-learning-index" onClick={(event) => { event.stopPropagation(); onOpenLearning?.() }} type="button"><span>02</span>{t("learning.archive")} <i aria-hidden="true">→</i></button>
      <button className="workspace-learning-index" onClick={(event) => { event.stopPropagation(); onOpenVocabulary?.() }} type="button"><span>03</span>{t("learning.words")} <i aria-hidden="true">→</i></button>
    </section>

    <section className="workspace-window workspace-todo-window" data-focused={focusedWindow === "todo" || undefined} onClick={() => onFocus("todo")}>
      <div className="flex items-center justify-between gap-3"><div><p className="workspace-window-kicker">TODO</p><p className="mt-1 text-sm font-medium">{todayTodoCount > 0 ? formatTranslation(t("timetable.todayTodos"), { count: todayTodoCount }) : t("timetable.todoDoneToday")}</p></div><CheckSquare aria-hidden="true" className="size-4 text-primary" /></div>
      <button className="workspace-window-link mt-3" onClick={(event) => { event.stopPropagation(); onOpenTodos?.() }} type="button">{t("timetable.viewTodos")}</button>
    </section>

    <section className="workspace-window workspace-ai-window" data-focused={focusedWindow === "ai" || undefined} onClick={() => onFocus("ai")}>
      <Sparkles aria-hidden="true" className="size-4 text-primary" />
      <div><p className="workspace-window-kicker">LEARNING TOOLS</p><p className="mt-1 text-sm font-medium">{t("timetable.aiAssistant")}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{t("common.comingSoon")} · {t("timetable.aiAssistantHint")}</p></div>
    </section>
  </aside>
}
