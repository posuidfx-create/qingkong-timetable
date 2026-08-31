import { ShieldCheck, UserRound } from "lucide-react"

import { getLocalizedRoleLabel } from "@/i18n/format"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/lib/utils"
import type { AppRole } from "@/types/auth"

const roleStyles: Record<AppRole, string> = {
  user: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  admin: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  super_admin: "bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200",
}

export function RoleBadge({ role }: { role: AppRole }) {
  const { locale } = useI18n()
  const Icon = role === "user" ? UserRound : ShieldCheck
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium", roleStyles[role])}><Icon className="size-3" />{getLocalizedRoleLabel(role, locale)}</span>
}
