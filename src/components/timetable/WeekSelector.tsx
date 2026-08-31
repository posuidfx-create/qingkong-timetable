import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { CourseFormValues, WeekSelectionMode } from "@/lib/courseForm"
import { useI18n } from "@/i18n/useI18n"
import { formatTranslation } from "@/i18n/translate"

interface WeekSelectorProps {
  error?: string
  maxWeek: number
  onChange: (updates: Partial<CourseFormValues>) => void
  value: CourseFormValues
}

const weekModes: readonly WeekSelectionMode[] = ["continuous", "odd", "even", "custom"]

interface WeekNumberSelectProps {
  ariaLabel: string
  maxWeek: number
  minWeek?: number
  onChange: (week: number) => void
  value: number
  weekLabel: (week: number) => string
}

function WeekNumberSelect({
  ariaLabel,
  maxWeek,
  minWeek = 1,
  onChange,
  value,
  weekLabel,
}: WeekNumberSelectProps) {
  const weeks = Array.from(
    { length: Math.max(0, maxWeek - minWeek + 1) },
    (_, index) => minWeek + index,
  )

  return (
    <Select
      value={String(value)}
      onValueChange={(nextValue) => {
        const selected = weeks.find((week) => String(week) === nextValue)
        if (selected !== undefined) onChange(selected)
      }}
    >
      <SelectTrigger aria-label={ariaLabel} className="h-11 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {weeks.map((week) => (
          <SelectItem key={week} value={String(week)} className="min-h-10">
            {weekLabel(week)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function WeekSelector({ error, maxWeek, onChange, value }: WeekSelectorProps) {
  const { t } = useI18n()
  const modeKeys = { continuous: "timetable.continuous", odd: "timetable.odd", even: "timetable.even", custom: "timetable.custom" } as const
  const weekLabel = (week: number) => formatTranslation(t("timetable.weekNumber"), { week })
  return (
    <fieldset aria-describedby={error ? "weeks-error" : "weeks-help"}>
      <legend className="text-sm font-medium">{t("timetable.weekPattern")} *</legend>
      <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
        {weekModes.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={value.weekMode === mode}
            className={cn(
              "min-h-11 rounded-lg px-1 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              value.weekMode === mode
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground active:bg-card/65",
            )}
            onClick={() => onChange({ weekMode: mode })}
          >
            {t(modeKeys[mode])}
          </button>
        ))}
      </div>

      {value.weekMode === "custom" ? (
        <div className="mt-3">
          <Label htmlFor="course-custom-weeks">{t("timetable.specificWeeks")}</Label>
          <Input
            id="course-custom-weeks"
            aria-invalid={Boolean(error)}
            className="mt-2 h-11"
            inputMode="numeric"
            placeholder={t("timetable.customWeeksPlaceholder")}
            value={value.customWeeks}
            onChange={(event) => onChange({ customWeeks: event.target.value })}
          />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div>
            <Label>{t("timetable.startWeek")}</Label>
            <div className="mt-2">
              <WeekNumberSelect
                ariaLabel={t("timetable.startWeek")}
                maxWeek={maxWeek}
                value={value.startWeek}
                weekLabel={weekLabel}
                onChange={(startWeek) =>
                  onChange({
                    startWeek,
                    endWeek: Math.max(startWeek, value.endWeek),
                  })
                }
              />
            </div>
          </div>
          <span className="pb-3 text-muted-foreground">{t("timetable.to")}</span>
          <div>
            <Label>{t("timetable.endWeek")}</Label>
            <div className="mt-2">
              <WeekNumberSelect
                ariaLabel={t("timetable.endWeek")}
                maxWeek={maxWeek}
                minWeek={value.startWeek}
                value={Math.max(value.startWeek, value.endWeek)}
                weekLabel={weekLabel}
                onChange={(endWeek) => onChange({ endWeek })}
              />
            </div>
          </div>
        </div>
      )}

      {error ? (
        <p id="weeks-error" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id="weeks-help" className="mt-2 text-xs leading-5 text-muted-foreground">
          {formatTranslation(t("timetable.weekRangeHelp"), { week: maxWeek })}
        </p>
      )}
    </fieldset>
  )
}
