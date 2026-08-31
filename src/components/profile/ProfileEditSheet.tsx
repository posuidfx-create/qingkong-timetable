import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useI18n } from "@/i18n/useI18n"
import type { Profile, ProfileCohortYear, ProfileIdentityType } from "@/types/auth"

export function ProfileEditSheet({ profile, open, onOpenChange, onSave, sheetTitle }: { profile: Profile | null; open: boolean; onOpenChange: (open: boolean) => void; onSave: (username: string, title: string, identityType: ProfileIdentityType, cohortYear: ProfileCohortYear | null) => Promise<void>; sheetTitle?: string }) {
  const { t } = useI18n()
  const [username, setUsername] = useState(profile?.username ?? "")
  const [title, setTitle] = useState(profile?.title ?? "")
  const [identityType, setIdentityType] = useState<ProfileIdentityType | null>(profile?.identityType ?? null)
  const [cohortYear, setCohortYear] = useState<ProfileCohortYear | null>(profile?.cohortYear ?? null)
  const [pending, setPending] = useState(false)
  const canSave = Boolean(username.trim() && (identityType === "teacher" || (identityType === "student" && cohortYear)))
  const chooseIdentity = (next: ProfileIdentityType) => { setIdentityType(next); if (next === "teacher") setCohortYear(null) }
  const save = async () => { if (!canSave || !identityType) return; setPending(true); try { await onSave(username, title, identityType, cohortYear); onOpenChange(false) } finally { setPending(false) } }
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="bottom" className="responsive-bottom-sheet rounded-t-3xl"><SheetHeader><SheetTitle>{sheetTitle ?? t("profile.editUser")}</SheetTitle><SheetDescription>{t("profile.titleDescription")}</SheetDescription></SheetHeader><div className="space-y-4 px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"><div><Label htmlFor="managed-username">{t("profile.username")}</Label><Input autoFocus className="mt-2 h-11" id="managed-username" maxLength={40} onChange={(event) => setUsername(event.target.value)} value={username} /></div><div><Label htmlFor="managed-title">{t("profile.badgeTitle")}</Label><Input className="mt-2 h-11" id="managed-title" maxLength={20} onChange={(event) => setTitle(event.target.value)} placeholder={t("profile.titlePlaceholder")} value={title} /></div><fieldset><legend className="mb-2 text-sm font-medium">{t("profile.identity")}</legend><div className="grid grid-cols-2 gap-2"><Button className="h-11" onClick={() => chooseIdentity("student")} type="button" variant={identityType === "student" ? "default" : "outline"}>{t("profile.student")}</Button><Button className="h-11" onClick={() => chooseIdentity("teacher")} type="button" variant={identityType === "teacher" ? "default" : "outline"}>{t("profile.teacher")}</Button></div></fieldset>{identityType === "student" && <fieldset><legend className="mb-2 text-sm font-medium">{t("profile.grade")}</legend><div className="grid grid-cols-2 gap-2"><Button className="h-11" onClick={() => setCohortYear(2024)} type="button" variant={cohortYear === 2024 ? "default" : "outline"}>{t("profile.grade24")}</Button><Button className="h-11" onClick={() => setCohortYear(2025)} type="button" variant={cohortYear === 2025 ? "default" : "outline"}>{t("profile.grade25")}</Button></div></fieldset>}<div className="flex gap-2"><Button className="h-11 flex-1" disabled={pending} onClick={() => onOpenChange(false)} type="button" variant="secondary">{t("common.cancel")}</Button><Button className="h-11 flex-1" disabled={pending || !canSave} onClick={() => void save()}>{pending ? t("todo.saving") : t("common.save")}</Button></div></div></SheetContent></Sheet>
}
