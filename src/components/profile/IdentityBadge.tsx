import { GraduationCap, Presentation } from "lucide-react"

import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/lib/utils"
import type { ProfileIdentityType } from "@/types/auth"

export function IdentityBadge({ identityType, className }: { identityType: ProfileIdentityType | null; className?: string }) {
  const { t } = useI18n()
  if (!identityType) return null
  const Icon = identityType === "student" ? GraduationCap : Presentation
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary", className)}><Icon aria-hidden="true" className="size-3" />{t(identityType === "student" ? "profile.student" : "profile.teacher")}</span>
}
