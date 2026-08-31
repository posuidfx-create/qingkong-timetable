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
import { LanguageMenu } from "@/components/layout/LanguageMenu"
import { useI18n } from "@/i18n/useI18n"

export function ProfilePage({ onOpenStatistics, onOpenChangelog, onOpenAbout }: { onOpenStatistics: () => void; onOpenChangelog: () => void; onOpenAbout: () => void }) {
  const { t } = useI18n()
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
      <h2 id="profile-title" className="mt-3 text-2xl font-semibold">{t("profile.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("profile.subtitle")}</p>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-start md:gap-5">
      <div className="space-y-4">
      <AccountSection />

      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 text-left" onClick={() => setCohortOpen(true)}><span className="flex shrink-0 items-center gap-2 text-sm font-semibold"><UsersRound className="size-4 text-primary" />{t("profile.identitySummary")}</span><span className="min-w-0 truncate text-xs text-muted-foreground">{profile?.identityType === "teacher" ? t("profile.teacher") : profile?.identityType === "student" && profile.cohortYear ? `${t("profile.student")} · ${t(profile.cohortYear === 2024 ? "profile.grade24" : "profile.grade25")}` : t("profile.chooseIdentity")} · {t("profile.changeIdentity")}</span></button></section>

      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="flex items-center gap-2 text-sm font-semibold"><Palette className="size-4 text-primary" />{t("profile.appearance")}</h3><Select value={settings.theme} onValueChange={(value) => updateSettings({ theme: value as ThemePreference })}><SelectTrigger aria-label={t("profile.theme")} className="mt-3 h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="light">{t("theme.light")}</SelectItem><SelectItem value="dark">{t("theme.dark")}</SelectItem><SelectItem value="system">{t("theme.system")}</SelectItem></SelectContent></Select></section>
      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><div className="flex min-h-11 items-center justify-between gap-3"><span className="text-sm font-semibold">{t("profile.language")}</span><LanguageMenu /></div></section>
      </div>
      <div className="space-y-4">
      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarCog className="size-4 text-primary" />{t("profile.timetableSettings")}</h3><label className="mt-3 flex min-h-11 items-center justify-between text-sm">{t("profile.showWeekends")}<Switch checked={settings.showWeekends} onCheckedChange={(checked) => updateSettings({ showWeekends: checked })} /></label></section>
      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><h3 className="text-sm font-semibold">{t("profile.semester")}</h3><div className="mt-3 grid gap-3"><Input aria-label={t("profile.semesterName")} value={semester.name} onChange={(event) => updateSemester({ name: event.target.value })} /><div className="grid grid-cols-2 gap-2"><Input aria-label={t("profile.semesterStart")} type="date" value={semester.startDate} onChange={(event) => updateSemester({ startDate: event.target.value })} /><Input aria-label={t("profile.semesterEnd")} type="date" value={semester.endDate} onChange={(event) => updateSemester({ endDate: event.target.value })} /></div><Input aria-label={t("profile.totalWeeks")} min="1" type="number" value={semester.totalWeeks} onChange={(event) => updateSemester({ totalWeeks: Number(event.target.value) })} /></div></section>
      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><button type="button" className="flex min-h-11 w-full items-center justify-between text-left" onClick={() => setTimeOpen(true)}><span className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4 text-primary" />{t("profile.sectionTimes")}</span><span className="text-xs text-muted-foreground">{t("profile.editSections")}</span></button></section>
      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><button type="button" className="flex min-h-11 w-full items-center justify-between text-left" onClick={() => setDataOpen(true)}><span className="flex items-center gap-2 text-sm font-semibold"><Database className="size-4 text-primary" />{t("profile.data")}</span><span className="text-xs text-muted-foreground">{t("profile.exportRestore")}</span></button></section>
      <section className="rounded-[20px] border bg-card p-4 shadow-xs"><Button className="w-full justify-between" onClick={onOpenStatistics} variant="ghost"><span className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="size-4 text-primary" />{t("statistics.title")}</span><span className="text-xs text-muted-foreground">{t("profile.studyOverview")}</span></Button></section>
      <section className="rounded-[20px] border bg-card p-4 shadow-xs" aria-labelledby="about-title"><h3 id="about-title" className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="size-4 text-primary" />{t("profile.about")}</h3><div className="mt-3 rounded-2xl bg-secondary/35 p-3"><div className="flex items-center justify-between gap-2"><p className="font-semibold">{t("brand.name")}</p><span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">v{APP_VERSION}</span></div><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><School className="size-3.5 text-primary" />{t("profile.school")}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{t("profile.schoolDescription")}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{t("profile.projectDescription")}</p><div className="mt-3 grid gap-2"><Button className="w-full justify-between" onClick={onOpenAbout} size="sm" variant="outline"><span className="flex items-center gap-2"><BookOpen />{t("profile.about")}</span><span className="text-xs text-muted-foreground">{t("profile.projectInfo")}</span></Button><Button className="w-full justify-between" onClick={onOpenChangelog} size="sm" variant="outline"><span className="flex items-center gap-2"><History />{t("profile.changelog")}</span><span className="text-xs text-muted-foreground">{t("profile.versionChanges")} · v{APP_VERSION}</span></Button></div></div></section>
      </div>
      </div>

      <Sheet open={timeOpen} onOpenChange={setTimeOpen}><SheetContent side="bottom" className="responsive-bottom-sheet max-h-[90dvh] rounded-t-3xl"><SheetHeader><SheetTitle>{t("profile.sectionTimes")}</SheetTitle><SheetDescription>{t("profile.sectionTimesDescription")}</SheetDescription></SheetHeader><div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">{sectionTimes.map((item) => { const sectionLabel = t("profile.sectionLabel").replace("{section}", String(item.section)); return <div key={item.section} className="grid grid-cols-[3rem_1fr_1fr] items-center gap-2 rounded-xl bg-muted/50 p-2 text-sm"><b>{sectionLabel}</b><Input aria-label={`${sectionLabel} ${t("timetable.startSection")}`} type="time" value={item.startTime} onChange={(event) => updateSectionTime(item.section, { startTime: event.target.value })} /><Input aria-label={`${sectionLabel} ${t("timetable.endSection")}`} type="time" value={item.endTime} onChange={(event) => updateSectionTime(item.section, { endTime: event.target.value })} /></div>})}</div><div className="border-t p-4"><AlertDialog><AlertDialogTrigger asChild><button type="button" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground"><RotateCcw className="size-4" />{t("profile.restoreDefaults")}</button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("profile.restoreDefaultsTitle")}</AlertDialogTitle><AlertDialogDescription>{t("profile.restoreDefaultsDescription")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={resetSectionTimes}>{t("profile.restoreDefaults")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></SheetContent></Sheet>
      <DataManagementSheet open={dataOpen} state={persistedState} onOpenChange={setDataOpen} onRestore={restoreAppData} onClearAll={clearAppData} />
      <CohortYearSheet open={cohortOpen} onOpenChange={setCohortOpen} />
    </section>
  )
}
