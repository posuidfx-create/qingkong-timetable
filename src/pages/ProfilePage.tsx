import { useState } from "react"
import { BarChart3, BookOpen, CalendarCog, Clock3, Database, History, Palette, RotateCcw, School, UserRound, UsersRound } from "lucide-react"

import { AccountSection } from "@/components/profile/AccountSection"
import { CohortYearSheet } from "@/components/profile/CohortYearSheet"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/authStore"
import { DataManagementSheet } from "@/components/profile/DataManagementSheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { CURRENT_SCHEMA_VERSION, type PersistedAppState } from "@/lib/storage"
import { useTimetableStore } from "@/store/timetableStore"
import type { ThemePreference } from "@/types/timetable"
import { APP_VERSION } from "@/constants/appVersion"

export function ProfilePage({ onOpenStatistics, onOpenChangelog }: { onOpenStatistics: () => void; onOpenChangelog: () => void }) {
  const courses = useTimetableStore((state) => state.courses)
  const semester = useTimetableStore((state) => state.semester)
  const sectionTimes = useTimetableStore((state) => state.sectionTimes)
  const todos = useTimetableStore((state) => state.todos)
  const settings = useTimetableStore((state) => state.settings)
  const updateSettings = useTimetableStore((state) => state.updateSettings)
  const updateSemester = useTimetableStore((state) => state.updateSemester)
  const updateSectionTime = useTimetableStore((state) => state.updateSectionTime)
  const resetSectionTimes = useTimetableStore((state) => state.resetSectionTimes)
  const restoreAppData = useTimetableStore((state) => state.restoreAppData)
  const clearAppData = useTimetableStore((state) => state.clearAppData)
  const [timeOpen, setTimeOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const [cohortOpen, setCohortOpen] = useState(false)
  const profile = useAuthStore((state) => state.profile)

  const persistedState: PersistedAppState = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    courses,
    semester,
    sectionTimes,
    todos,
    settings,
  }

  return (
    <section className="mx-auto w-full max-w-md pb-8 md:max-w-5xl" aria-labelledby="profile-title">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary"><UserRound className="size-5" /></div>
      <h2 id="profile-title" className="mt-3 text-2xl font-semibold">我的</h2>
      <p className="mt-1 text-sm text-muted-foreground">把课表调成适合自己的节奏。</p>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-start md:gap-5">
      <div className="space-y-4">
      <AccountSection />

      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><button type="button" className="flex min-h-11 w-full items-center justify-between text-left" onClick={() => setCohortOpen(true)}><span className="flex items-center gap-2 text-sm font-semibold"><UsersRound className="size-4 text-primary" />所属年级</span><span className="text-xs text-muted-foreground">{profile?.cohortYear ? `${profile.cohortYear === 2024 ? "24" : "25"}级 · 修改` : "选择年级"}</span></button></section>

      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="flex items-center gap-2 text-sm font-semibold"><Palette className="size-4 text-primary" />外观</h3><Select value={settings.theme} onValueChange={(value) => updateSettings({ theme: value as ThemePreference })}><SelectTrigger aria-label="主题" className="mt-3 h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="light">浅色</SelectItem><SelectItem value="dark">深色</SelectItem><SelectItem value="system">跟随系统</SelectItem></SelectContent></Select></section>
      </div>
      <div className="space-y-4">
      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarCog className="size-4 text-primary" />课表设置</h3><label className="mt-3 flex min-h-11 items-center justify-between text-sm">显示周末<Switch checked={settings.showWeekends} onCheckedChange={(checked) => updateSettings({ showWeekends: checked })} /></label></section>
      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="text-sm font-semibold">学期信息</h3><div className="mt-3 grid gap-3"><Input aria-label="学期名称" value={semester.name} onChange={(event) => updateSemester({ name: event.target.value })} /><div className="grid grid-cols-2 gap-2"><Input aria-label="学期开始日期" type="date" value={semester.startDate} onChange={(event) => updateSemester({ startDate: event.target.value })} /><Input aria-label="学期结束日期" type="date" value={semester.endDate} onChange={(event) => updateSemester({ endDate: event.target.value })} /></div><Input aria-label="总周数" min="1" type="number" value={semester.totalWeeks} onChange={(event) => updateSemester({ totalWeeks: Number(event.target.value) })} /></div></section>
      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><button type="button" className="flex min-h-11 w-full items-center justify-between text-left" onClick={() => setTimeOpen(true)}><span className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4 text-primary" />作息时间</span><span className="text-xs text-muted-foreground">编辑 1–11 节</span></button></section>
      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><button type="button" className="flex min-h-11 w-full items-center justify-between text-left" onClick={() => setDataOpen(true)}><span className="flex items-center gap-2 text-sm font-semibold"><Database className="size-4 text-primary" />数据备份与恢复</span><span className="text-xs text-muted-foreground">导出 / 恢复</span></button></section>
      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><Button className="w-full justify-between" onClick={onOpenStatistics} variant="ghost"><span className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="size-4 text-primary" />统计</span><span className="text-xs text-muted-foreground">查看学习概览</span></Button></section>
      <section className="rounded-[20px] border bg-card p-4 shadow-xs" aria-labelledby="about-title"><h3 id="about-title" className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="size-4 text-primary" />关于晴空课表</h3><div className="mt-3 rounded-2xl bg-secondary/35 p-3"><div className="flex items-center justify-between gap-2"><p className="font-semibold">晴空课表</p><span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">v{APP_VERSION}</span></div><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><School className="size-3.5 text-primary" />大连东软信息学院</p><p className="mt-1 text-xs leading-5 text-muted-foreground">国际教育学院（中外合作办学）校园学习生活小助手</p><p className="mt-2 text-xs leading-5 text-muted-foreground">本项目为校园学习生活辅助工具。</p><Button className="mt-3 w-full justify-between" onClick={onOpenChangelog} size="sm" variant="outline"><span className="flex items-center gap-2"><History />更新日志</span><span className="text-xs text-muted-foreground">查看版本变化 · v{APP_VERSION}</span></Button></div></section>
      </div>
      </div>

      <Sheet open={timeOpen} onOpenChange={setTimeOpen}><SheetContent side="bottom" className="responsive-bottom-sheet max-h-[90dvh] rounded-t-3xl"><SheetHeader><SheetTitle>作息时间</SheetTitle><SheetDescription>可逐节调整上课时间。</SheetDescription></SheetHeader><div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">{sectionTimes.map((item) => <div key={item.section} className="grid grid-cols-[3rem_1fr_1fr] items-center gap-2 rounded-xl bg-muted/50 p-2 text-sm"><b>第{item.section}节</b><Input aria-label={`第${item.section}节开始时间`} type="time" value={item.startTime} onChange={(event) => updateSectionTime(item.section, { startTime: event.target.value })} /><Input aria-label={`第${item.section}节结束时间`} type="time" value={item.endTime} onChange={(event) => updateSectionTime(item.section, { endTime: event.target.value })} /></div>)}</div><div className="border-t p-4"><AlertDialog><AlertDialogTrigger asChild><button type="button" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground"><RotateCcw className="size-4" />恢复默认作息</button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>恢复默认作息？</AlertDialogTitle><AlertDialogDescription>这会将第 1–11 节的时间恢复为应用默认值。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={resetSectionTimes}>恢复默认</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></SheetContent></Sheet>
      <DataManagementSheet open={dataOpen} state={persistedState} onOpenChange={setDataOpen} onRestore={restoreAppData} onClearAll={clearAppData} />
      <CohortYearSheet open={cohortOpen} onOpenChange={setCohortOpen} />
    </section>
  )
}
