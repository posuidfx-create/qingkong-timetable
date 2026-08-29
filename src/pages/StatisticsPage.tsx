import { BarChart3, CheckCircle2, Flame, ShieldAlert } from "lucide-react"
import { useMemo } from "react"
import { getBusiestWeekday, getConflictStats, getCourseItemCount, getCurrentWeekStats, getTodoStats, getUniqueCourseCount, getWeekdayCourseLoad, getWeeklyCourseStats } from "@/lib/statistics"
import { useTimetableStore } from "@/store/timetableStore"

const labels = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"]

export function StatisticsPage() {
  const courses = useTimetableStore((state) => state.courses)
  const todos = useTimetableStore((state) => state.todos)
  const currentWeek = useTimetableStore((state) => state.currentWeek)
  const semester = useTimetableStore((state) => state.semester)
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
      <h2 id="statistics-title" className="mt-3 text-2xl font-semibold">统计</h2><p className="mt-1 text-sm text-muted-foreground">当前第 {currentWeek} 周的小结</p>
      <section className="mt-5 rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="text-sm font-semibold">课程概览</h3><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><p className="rounded-xl bg-secondary/45 p-3"><b className="block text-lg text-primary">{getUniqueCourseCount(courses)}</b>门不同课程</p><p className="rounded-xl bg-muted p-3"><b className="block text-lg">{getCourseItemCount(courses)}</b>个课程安排</p><p className="rounded-xl bg-accent/60 p-3"><b className="block text-lg">{current.sections}</b>本周节数</p><p className="rounded-xl bg-muted p-3"><b className="block text-lg">{current.activeDays}</b>天有课</p></div></section>
      <section className="mt-4 rounded-[20px] border bg-card p-4 shadow-xs"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">学期负荷</h3><span className="text-xs text-muted-foreground">{busiest ? `${labels[busiest.dayOfWeek]}最忙 · ${busiest.sections}节` : "暂无课程"}</span></div><div className="mt-4 flex h-20 items-end gap-px" aria-label="每周课程节数趋势">{weekly.map((item) => <div key={item.week} className="flex min-w-0 flex-1 flex-col justify-end"><div title={`第${item.week}周 ${item.sections}节`} className={item.week === currentWeek ? "rounded-t bg-primary" : "rounded-t bg-accent-foreground/45"} style={{height:`${Math.max(item.sections ? 8 : 2, item.sections / maxLoad * 100)}%`}} /><span className="mt-1 text-center text-[8px] text-muted-foreground">{item.week % 5 === 0 ? item.week : ""}</span></div>)}</div><div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Flame className="size-3.5 text-primary" />本周 {current.items} 个课程安排</div></section>
      <section className="mt-4 rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="text-sm font-semibold">待办</h3><div className="mt-3 flex items-center justify-between text-sm"><span>未完成 {todo.remaining} · 已完成 {todo.completed}</span><span className="font-semibold text-primary">{todo.completionRate === undefined ? "暂无待办" : `完成率 ${todo.completionRate}%`}</span></div><p className="mt-2 text-xs text-muted-foreground">已逾期 {todo.overdue} 项</p></section>
      <section className="mt-4 rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="size-4 text-primary" />时间冲突</h3><p className="mt-2 text-sm">学期 {conflicts.semester} 组 · 本周 {conflicts.currentWeek} 组</p>{conflicts.semester === 0 ? <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="size-3.5 text-accent-foreground" />目前没有冲突</p> : null}</section>
    </section>
  )
}
