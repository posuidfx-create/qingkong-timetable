import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Profile } from "@/types/auth"

export function ProfileEditSheet({ profile, open, onOpenChange, onSave, sheetTitle = "编辑用户资料" }: { profile: Profile | null; open: boolean; onOpenChange: (open: boolean) => void; onSave: (username: string, title: string) => Promise<void>; sheetTitle?: string }) {
  const [username, setUsername] = useState(profile?.username ?? ""); const [title, setTitle] = useState(profile?.title ?? ""); const [pending, setPending] = useState(false)
  const save = async () => { if (!username.trim()) return; setPending(true); try { await onSave(username, title); onOpenChange(false) } finally { setPending(false) } }
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="bottom" className="responsive-bottom-sheet rounded-t-3xl"><SheetHeader><SheetTitle>{sheetTitle}</SheetTitle><SheetDescription>头衔仅用于展示，不会影响任何权限。</SheetDescription></SheetHeader><div className="space-y-4 px-4 pb-5"><div><Label htmlFor="managed-username">昵称</Label><Input autoFocus className="mt-2 h-11" id="managed-username" maxLength={40} onChange={(event) => setUsername(event.target.value)} value={username} /></div><div><Label htmlFor="managed-title">头衔</Label><Input className="mt-2 h-11" id="managed-title" maxLength={20} onChange={(event) => setTitle(event.target.value)} placeholder="例如：班级负责人" value={title} /></div><div className="flex gap-2"><Button className="h-11 flex-1" disabled={pending} onClick={() => onOpenChange(false)} type="button" variant="secondary">取消</Button><Button className="h-11 flex-1" disabled={pending || !username.trim()} onClick={() => void save()}>{pending ? "正在保存…" : "保存"}</Button></div></div></SheetContent></Sheet>
}
