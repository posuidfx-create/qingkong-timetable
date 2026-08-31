import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/useI18n"
import type { ProfileCohortYear } from "@/types/auth"

export function CohortBadge({ year, className }: { year: ProfileCohortYear | null; className?: string }) {
  const { t } = useI18n()
  if (!year) return null
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", year === 2024 ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200" : "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200", className)}>{t(year === 2024 ? "profile.grade24" : "profile.grade25")}</span>
}
