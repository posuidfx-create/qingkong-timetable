import { BarChart3, CheckCircle2, Flame, ShieldAlert } from "lucide-react"
import { useMemo } from "react"
import { getVisibleCourses } from "@/data/builtinTimetables"
import { getBusiestWeekday, getConflictStats, getCourseItemCount, getCurrentWeekStats, getTodoStats, getUniqueCourseCount, getWeekdayCourseLoad, getWeeklyCourseStats } from "@/lib/statistics"
import { useTimetableStore } from "@/store/timetableStore"
import { useI18n } from "@/i18n/useI18n"
import { getLocalizedDayLabel } from "@/i18n/format"
import { formatTranslation } from "@/i18n/translate"

export function StatisticsPage() {
  const { locale, t } = useI18n()
  const userCourses = useTimetableStore((state) => state.courses)
  const todos = useTimetableStore((state) => state.todos)
  const currentWeek = useTimetableStore((state) => state.currentWeek)
  const semester = useTimetableStore((state) => state.semester)
  const cohortYear = useTimetableStore((state) => state.settings.cohortYear)
  const courses = useMemo(() => getVisibleCourses(cohortYear, userCourses), [cohortYear, userCourses])
  const now = useMemo(() => new Date(), [])
  const current = useMemo(() => getCurrentWeekStats(courses, currentWeek), [courses, currentWeek])
  const weekly = useMemo(() => getWeeklyCourseStats(courses, semester.totalWeeks), [courses, semester.totalWeeks])
  const load = useMemo(() => getWeekdayCourseLoad(courses), [courses])
  const busiest = useMemo(() => getBusiestWeekday(load), [load])
  const todo = useMemo(() => getTodoStats(todos, now), [todos, now])
  const conflicts = useMemo(() => getConflictStats(courses, currentWeek), [courses, currentWeek])
  const maxLoad = Math.max(1, ...weekly.map((item) => item.sections))
  return (
    <section className="mx-auto w-full max-w-md pb-8" aria-labelledby="statistics-title">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary"><BarChart3 className="size-5" /></div>
      <h2 id="statistics-title" className="mt-3 text-2xl font-semibold">{t("statistics.title")}</h2><p className="mt-1 text-sm text-muted-foreground">{formatTranslation(t("statistics.weekSummary"), { week: currentWeek })}</p>
      <section className="mt-5 rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="text-sm font-semibold">{t("statistics.courseOverview")}</h3><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><p className="rounded-xl bg-secondary/45 p-3"><b className="block text-lg text-primary">{getUniqueCourseCount(courses)}</b>{t("statistics.uniqueCourses")}</p><p className="rounded-xl bg-muted p-3"><b className="block text-lg">{getCourseItemCount(courses)}</b>{t("statistics.courseItems")}</p><p className="rounded-xl bg-accent/60 p-3"><b className="block text-lg">{current.sections}</b>{t("statistics.weekSections")}</p><p className="rounded-xl bg-muted p-3"><b className="block text-lg">{current.activeDays}</b>{t("statistics.activeDays")}</p></div></section>
      <section className="mt-4 rounded-[20px] border bg-card p-4 shadow-xs"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{t("statistics.semesterLoad")}</h3><span className="text-xs text-muted-foreground">{busiest ? formatTranslation(t("statistics.busiest"), { day: getLocalizedDayLabel(busiest.dayOfWeek, locale), sections: busiest.sections }) : t("statistics.noCourses")}</span></div><div className="mt-4 flex h-20 items-end gap-px" aria-label={t("statistics.weekTrend")}>{weekly.map((item) => <div key={item.week} className="flex min-w-0 flex-1 flex-col justify-end"><div title={`${item.week} · ${item.sections}`} className={item.week === currentWeek ? "rounded-t bg-primary" : "rounded-t bg-accent-foreground/45"} style={{height:`${Math.max(item.sections ? 8 : 2, item.sections / maxLoad * 100)}%`}} /><span className="mt-1 text-center text-[8px] text-muted-foreground">{item.week % 5 === 0 ? item.week : ""}</span></div>)}</div><div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Flame className="size-3.5 text-primary" />{formatTranslation(t("statistics.weekItems"), { items: current.items })}</div></section>
      <section className="mt-4 rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="text-sm font-semibold">{t("statistics.todo")}</h3><div className="mt-3 flex items-center justify-between text-sm"><span>{t("statistics.remaining")} {todo.remaining} · {t("statistics.completed")} {todo.completed}</span><span className="font-semibold text-primary">{todo.completionRate === undefined ? t("statistics.noTodo") : formatTranslation(t("statistics.completionRate"), { rate: todo.completionRate })}</span></div><p className="mt-2 text-xs text-muted-foreground">{formatTranslation(t("statistics.overdue"), { count: todo.overdue })}</p></section>
      <section className="mt-4 rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="size-4 text-primary" />{t("statistics.conflicts")}</h3><p className="mt-2 text-sm">{formatTranslation(t("statistics.conflictSummary"), { semester: conflicts.semester, week: conflicts.currentWeek })}</p>{conflicts.semester === 0 ? <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="size-3.5 text-accent-foreground" />{t("statistics.noConflicts")}</p> : null}</section>
    </section>
  )
}
