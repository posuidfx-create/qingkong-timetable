import { ChevronLeft, ChevronRight, FileUp, LocateFixed } from "lucide-react"

import type { CohortYear } from "@/data/builtinTimetables"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/useI18n"
import { formatTranslation } from "@/i18n/translate"

interface TimetableHeaderProps {
  semesterName: string
  currentWeek: number
  totalWeeks: number
  dateRange: string
  cohortYear?: CohortYear
  onGoToCurrentWeek: () => void
  onNextWeek: () => void
  onPreviousWeek: () => void
  onImportExcel: () => void
  onCohortChange: (cohortYear: CohortYear) => void
  onWeekChange: (week: number) => void
  currentWeekTarget: number
}

function formatWeek(week: number): string {
  return String(week).padStart(2, "0")
}

export function TimetableHeader({
  semesterName,
  currentWeek,
  totalWeeks,
  dateRange,
  cohortYear,
  onGoToCurrentWeek,
  onNextWeek,
  onPreviousWeek,
  onImportExcel,
  onCohortChange,
  onWeekChange,
  currentWeekTarget,
}: TimetableHeaderProps) {
  const { t } = useI18n()
  const weeks = Array.from({ length: totalWeeks }, (_, index) => index + 1)

  return <section aria-labelledby="timetable-heading" className="timetable-header">
    <div className="timetable-header-main">
      <div className="min-w-0">
        <p className="timetable-brand-kicker">{t("brand.name")}</p>
        <h2 id="timetable-heading" className="timetable-semester-name">{semesterName}</h2>
        <p className="timetable-brand-slogan">{t("brand.slogan")}</p>
      </div>
      <div className="timetable-header-meta">
        <div className="timetable-week-identity"><span className="timetable-week-number">{formatWeek(currentWeek)}</span><span className="timetable-week-label">WEEK</span></div>
        <p className="timetable-date-range">{dateRange}</p>
      </div>
    </div>

    <div className="timetable-header-controls">
      <div className="timetable-cohort-toggle" aria-label={t("timetable.viewCohort")}>
        {([2024, 2025] as const).map((year) => <button aria-pressed={cohortYear === year} className={cn("timetable-cohort-option", cohortYear === year && "is-active")} key={year} onClick={() => onCohortChange(year)} type="button"><span>{String(year).slice(2)}</span><small>{t("profile.cohortSuffix")}</small></button>)}
      </div>
      <div className="timetable-utility-actions">
        <button aria-label={t("timetable.importCustom")} className="timetable-utility-button" onClick={onImportExcel} type="button"><FileUp aria-hidden="true" className="size-4" /><span className="hidden sm:inline">{t("timetable.import")}</span></button>
        <button className="timetable-utility-button" disabled={currentWeek === currentWeekTarget} onClick={onGoToCurrentWeek} type="button"><LocateFixed aria-hidden="true" className="size-4" />{t("timetable.currentWeek")}</button>
      </div>
    </div>

    <div className="timetable-week-navigation" aria-label={t("timetable.weekNavigation")}>
      <button aria-label={t("timetable.viewPreviousWeek")} className="timetable-week-arrow" disabled={currentWeek <= 1} onClick={onPreviousWeek} type="button"><ChevronLeft aria-hidden="true" className="size-4" /><span className="hidden md:inline">{t("timetable.previousWeek")}</span></button>
      <div className="timetable-week-strip" role="list" aria-label={formatTranslation(t("timetable.totalWeeks"), { count: totalWeeks })}>
        {weeks.map((week) => <button aria-current={week === currentWeek ? "step" : undefined} aria-label={formatTranslation(t("timetable.viewWeek"), { week })} className={cn("timetable-week-option", week === currentWeek && "is-active")} key={week} onClick={() => onWeekChange(week)} role="listitem" type="button">{formatWeek(week)}</button>)}
      </div>
      <button aria-label={t("timetable.viewNextWeek")} className="timetable-week-arrow" disabled={currentWeek >= totalWeeks} onClick={onNextWeek} type="button"><span className="hidden md:inline">{t("timetable.nextWeek")}</span><ChevronRight aria-hidden="true" className="size-4" /></button>
    </div>
  </section>
}
