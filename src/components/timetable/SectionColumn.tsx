import type { SectionTime } from "@/types/timetable"

interface SectionColumnProps {
  sectionTimes: readonly SectionTime[]
}

export function SectionColumn({ sectionTimes }: SectionColumnProps) {
  return sectionTimes.map((sectionTime) => (
    <div
      key={sectionTime.section}
      className="flex min-w-0 flex-col items-center justify-center border-t bg-muted/55 px-0.5 text-center"
      style={{ gridColumn: 1, gridRow: sectionTime.section + 1 }}
    >
      <span className="rounded-md px-1 text-sm font-semibold tabular-nums text-foreground">
        {sectionTime.section}
      </span>
      <span className="mt-0.5 text-[8px] leading-[1.2] tabular-nums text-muted-foreground sm:text-[9px]">
        {sectionTime.startTime}
        <br />
        {sectionTime.endTime}
      </span>
    </div>
  ))
}
