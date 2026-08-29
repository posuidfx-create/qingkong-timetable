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

interface WeekSelectorProps {
  error?: string
  maxWeek: number
  onChange: (updates: Partial<CourseFormValues>) => void
  value: CourseFormValues
}

const weekModes: readonly { value: WeekSelectionMode; label: string }[] = [
  { value: "continuous", label: "连续周" },
  { value: "odd", label: "单周" },
  { value: "even", label: "双周" },
  { value: "custom", label: "自定义" },
]

interface WeekNumberSelectProps {
  ariaLabel: string
  maxWeek: number
  minWeek?: number
  onChange: (week: number) => void
  value: number
}

function WeekNumberSelect({
  ariaLabel,
  maxWeek,
  minWeek = 1,
  onChange,
  value,
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
            第 {week} 周
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function WeekSelector({ error, maxWeek, onChange, value }: WeekSelectorProps) {
  return (
    <fieldset aria-describedby={error ? "weeks-error" : "weeks-help"}>
      <legend className="text-sm font-medium">上课周次 *</legend>
      <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
        {weekModes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            aria-pressed={value.weekMode === mode.value}
            className={cn(
              "min-h-11 rounded-lg px-1 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              value.weekMode === mode.value
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground active:bg-card/65",
            )}
            onClick={() => onChange({ weekMode: mode.value })}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {value.weekMode === "custom" ? (
        <div className="mt-3">
          <Label htmlFor="course-custom-weeks">具体周次</Label>
          <Input
            id="course-custom-weeks"
            aria-invalid={Boolean(error)}
            className="mt-2 h-11"
            inputMode="numeric"
            placeholder="例如：1,3,5,7"
            value={value.customWeeks}
            onChange={(event) => onChange({ customWeeks: event.target.value })}
          />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div>
            <Label>开始周</Label>
            <div className="mt-2">
              <WeekNumberSelect
                ariaLabel="开始周"
                maxWeek={maxWeek}
                value={value.startWeek}
                onChange={(startWeek) =>
                  onChange({
                    startWeek,
                    endWeek: Math.max(startWeek, value.endWeek),
                  })
                }
              />
            </div>
          </div>
          <span className="pb-3 text-muted-foreground">至</span>
          <div>
            <Label>结束周</Label>
            <div className="mt-2">
              <WeekNumberSelect
                ariaLabel="结束周"
                maxWeek={maxWeek}
                minWeek={value.startWeek}
                value={Math.max(value.startWeek, value.endWeek)}
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
          周次范围限制在本学期第 1～{maxWeek} 周
        </p>
      )}
    </fieldset>
  )
}
