import { cn } from "@/lib/utils"
import type { ProfileCohortYear } from "@/types/auth"

export function CohortBadge({ year, className }: { year: ProfileCohortYear | null; className?: string }) {
  if (!year) return <span className={cn("rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground", className)}>未选年级</span>
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", year === 2024 ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200" : "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200", className)}>{year === 2024 ? "24级" : "25级"}</span>
}
