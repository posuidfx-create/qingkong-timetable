import { useState } from "react"

import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { updateOwnCohortYear } from "@/lib/profiles"
import { authStore, useAuthStore } from "@/store/authStore"
import type { ProfileCohortYear } from "@/types/auth"

export function CohortYearSheet({ open, onOpenChange, required = false }: { open: boolean; onOpenChange: (open: boolean) => void; required?: boolean }) {
  const profile = useAuthStore((state) => state.profile)
  const [pending, setPending] = useState<ProfileCohortYear | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmYear, setConfirmYear] = useState<ProfileCohortYear | null>(null)
  const save = async (cohortYear: ProfileCohortYear) => {
    setPending(cohortYear); setError(null)
    try { const updated = await updateOwnCohortYear(cohortYear); authStore.getState().updateProfile(updated); onOpenChange(false) }
    catch (reason) { setError(reason instanceof Error ? reason.message : "年级保存失败。") }
    finally { setPending(null) }
  }
  const choose = (year: ProfileCohortYear) => { if (required) void save(year); else setConfirmYear(year) }
  return <><Sheet open={open} onOpenChange={(next) => { if (!required || next) onOpenChange(next) }}><SheetContent side="bottom" className="responsive-bottom-sheet rounded-t-3xl"><SheetHeader><SheetTitle>{required ? "选择你的年级" : "修改所属年级"}</SheetTitle><SheetDescription>所属年级只决定可访问的年级聊天室，不会修改你当前查看的课表年级。</SheetDescription></SheetHeader><div className="space-y-3 px-4 pb-5"><Button className="h-12 w-full" disabled={pending !== null || profile?.cohortYear === 2024} onClick={() => choose(2024)}>我是 24 级</Button><Button className="h-12 w-full" disabled={pending !== null || profile?.cohortYear === 2025} onClick={() => choose(2025)} variant="secondary">我是 25 级</Button>{!required && <p className="text-center text-xs text-muted-foreground">修改后聊天室访问权限会立即更新。</p>}{error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}</div></SheetContent></Sheet><AlertDialog open={confirmYear !== null} onOpenChange={(next) => { if (!next) setConfirmYear(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认修改所属年级？</AlertDialogTitle><AlertDialogDescription>这只会变更聊天室访问权限，不会修改课表页面当前查看的年级。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={() => { if (confirmYear) void save(confirmYear) }}>确认修改</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>
}
