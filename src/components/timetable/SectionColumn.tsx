import type { SectionTime } from "@/types/timetable"

interface SectionColumnProps {
  sectionTimes: readonly SectionTime[]
}

export function SectionColumn({ sectionTimes }: SectionColumnProps) {
  return sectionTimes.map((sectionTime) => (
    <div
      key={sectionTime.section}
      className="timetable-section-column flex min-w-0 flex-col items-center justify-center border-t px-0.5 text-center"
      style={{ gridColumn: 1, gridRow: sectionTime.section + 1 }}
    >
      <span className="text-base font-medium tabular-nums text-foreground md:text-lg">
        {String(sectionTime.section).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[8px] leading-[1.3] tracking-[0.04em] tabular-nums text-muted-foreground sm:text-[9px]">
        {sectionTime.startTime}
        <br />
        {sectionTime.endTime}
      </span>
    </div>
  ))
}
