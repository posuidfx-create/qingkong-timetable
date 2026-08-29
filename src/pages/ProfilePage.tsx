import { useState } from "react"
import { CalendarCog, Clock3, Database, Palette, RotateCcw, UserRound } from "lucide-react"

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

export function ProfilePage() {
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

  const persistedState: PersistedAppState = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    courses,
    semester,
    sectionTimes,
    todos,
    settings,
  }

  return (
    <section className="mx-auto w-full max-w-md pb-8" aria-labelledby="profile-title">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary"><UserRound className="size-5" /></div>
      <h2 id="profile-title" className="mt-3 text-2xl font-semibold">我的</h2>
      <p className="mt-1 text-sm text-muted-foreground">把课表调成适合自己的节奏。</p>

      <section className="mt-5 rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="flex items-center gap-2 text-sm font-semibold"><Palette className="size-4 text-primary" />外观</h3><Select value={settings.theme} onValueChange={(value) => updateSettings({ theme: value as ThemePreference })}><SelectTrigger aria-label="主题" className="mt-3 h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="light">浅色</SelectItem><SelectItem value="dark">深色</SelectItem><SelectItem value="system">跟随系统</SelectItem></SelectContent></Select></section>
      <section className="mt-4 rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarCog className="size-4 text-primary" />课表设置</h3><label className="mt-3 flex min-h-11 items-center justify-between text-sm">显示周末<Switch checked={settings.showWeekends} onCheckedChange={(checked) => updateSettings({ showWeekends: checked })} /></label></section>
      <section className="mt-4 rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="text-sm font-semibold">学期信息</h3><div className="mt-3 grid gap-3"><Input aria-label="学期名称" value={semester.name} onChange={(event) => updateSemester({ name: event.target.value })} /><div className="grid grid-cols-2 gap-2"><Input aria-label="学期开始日期" type="date" value={semester.startDate} onChange={(event) => updateSemester({ startDate: event.target.value })} /><Input aria-label="学期结束日期" type="date" value={semester.endDate} onChange={(event) => updateSemester({ endDate: event.target.value })} /></div><Input aria-label="总周数" min="1" type="number" value={semester.totalWeeks} onChange={(event) => updateSemester({ totalWeeks: Number(event.target.value) })} /></div></section>
      <section className="mt-4 rounded-[20px] border bg-card p-4 shadow-xs"><button type="button" className="flex min-h-11 w-full items-center justify-between text-left" onClick={() => setTimeOpen(true)}><span className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4 text-primary" />作息时间</span><span className="text-xs text-muted-foreground">编辑 1–11 节</span></button></section>
      <section className="mt-4 rounded-[20px] border bg-card p-4 shadow-xs"><button type="button" className="flex min-h-11 w-full items-center justify-between text-left" onClick={() => setDataOpen(true)}><span className="flex items-center gap-2 text-sm font-semibold"><Database className="size-4 text-primary" />数据备份与恢复</span><span className="text-xs text-muted-foreground">导出 / 恢复</span></button></section>

      <Sheet open={timeOpen} onOpenChange={setTimeOpen}><SheetContent side="bottom" className="responsive-bottom-sheet max-h-[90dvh] rounded-t-3xl"><SheetHeader><SheetTitle>作息时间</SheetTitle><SheetDescription>可逐节调整上课时间。</SheetDescription></SheetHeader><div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">{sectionTimes.map((item) => <div key={item.section} className="grid grid-cols-[3rem_1fr_1fr] items-center gap-2 rounded-xl bg-muted/50 p-2 text-sm"><b>第{item.section}节</b><Input aria-label={`第${item.section}节开始时间`} type="time" value={item.startTime} onChange={(event) => updateSectionTime(item.section, { startTime: event.target.value })} /><Input aria-label={`第${item.section}节结束时间`} type="time" value={item.endTime} onChange={(event) => updateSectionTime(item.section, { endTime: event.target.value })} /></div>)}</div><div className="border-t p-4"><AlertDialog><AlertDialogTrigger asChild><button type="button" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground"><RotateCcw className="size-4" />恢复默认作息</button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>恢复默认作息？</AlertDialogTitle><AlertDialogDescription>这会将第 1–11 节的时间恢复为应用默认值。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={resetSectionTimes}>恢复默认</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></SheetContent></Sheet>
      <DataManagementSheet open={dataOpen} state={persistedState} onOpenChange={setDataOpen} onRestore={restoreAppData} onClearAll={clearAppData} />
    </section>
  )
}
