import { useState } from "react"
import { GraduationCap, Presentation } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useI18n } from "@/i18n/useI18n"
import { updateOwnIdentity } from "@/lib/profiles"
import { authStore, useAuthStore } from "@/store/authStore"
import type { ProfileCohortYear, ProfileIdentityType } from "@/types/auth"

interface CohortYearSheetProps { open: boolean; onOpenChange: (open: boolean) => void; required?: boolean }

export function CohortYearSheet({ open, onOpenChange, required = false }: CohortYearSheetProps) {
  const { t } = useI18n()
  const profile = useAuthStore((state) => state.profile)
  const [identityType, setIdentityType] = useState<ProfileIdentityType | null>(profile?.identityType ?? null)
  const [cohortYear, setCohortYear] = useState<ProfileCohortYear | null>(profile?.cohortYear ?? null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chooseIdentity = (next: ProfileIdentityType) => { setIdentityType(next); if (next === "teacher") setCohortYear(null) }
  const canSave = identityType === "teacher" || (identityType === "student" && cohortYear !== null)
  const save = async () => {
    if (!profile || !identityType || !canSave) return
    setPending(true); setError(null)
    try { const updated = await updateOwnIdentity(profile, identityType, cohortYear); authStore.getState().updateProfile(updated); onOpenChange(false) }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("common.error")) }
    finally { setPending(false) }
  }
  const handleOpenChange = (next: boolean) => {
    if (required && !next) return
    if (!next) { setIdentityType(profile?.identityType ?? null); setCohortYear(profile?.cohortYear ?? null); setError(null) }
    onOpenChange(next)
  }

  return <Sheet open={open} onOpenChange={handleOpenChange}><SheetContent side="bottom" className="responsive-bottom-sheet rounded-t-3xl">
    <SheetHeader><SheetTitle>{t("profile.chooseIdentity")}</SheetTitle><SheetDescription>{t("profile.chooseIdentityDescription")}</SheetDescription></SheetHeader>
    <div className="space-y-5 px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
      <fieldset><legend className="mb-2 text-sm font-medium">{t("profile.identity")}</legend><div className="grid grid-cols-2 gap-2">
        <Button className="h-12" onClick={() => chooseIdentity("student")} type="button" variant={identityType === "student" ? "default" : "outline"}><GraduationCap />{t("profile.student")}</Button>
        <Button className="h-12" onClick={() => chooseIdentity("teacher")} type="button" variant={identityType === "teacher" ? "default" : "outline"}><Presentation />{t("profile.teacher")}</Button>
      </div></fieldset>
      {identityType === "student" ? <fieldset><legend className="mb-2 text-sm font-medium">{t("profile.grade")}</legend><div className="grid grid-cols-2 gap-2">
        <Button className="h-12" onClick={() => setCohortYear(2024)} type="button" variant={cohortYear === 2024 ? "default" : "outline"}>{t("profile.grade24")}</Button>
        <Button className="h-12" onClick={() => setCohortYear(2025)} type="button" variant={cohortYear === 2025 ? "default" : "outline"}>{t("profile.grade25")}</Button>
      </div></fieldset> : null}
      {error ? <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p> : null}
      <Button className="h-12 w-full" disabled={pending || !canSave} onClick={() => void save()}>{pending ? t("todo.saving") : t("common.save")}</Button>
    </div>
  </SheetContent></Sheet>
}
