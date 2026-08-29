import { useEffect, useMemo, useState } from "react"
import { LogOut, Pencil, Search, ShieldCheck, UsersRound } from "lucide-react"
import { ProfileEditSheet } from "@/components/profile/ProfileEditSheet"

import { RoleBadge } from "@/components/profile/RoleBadge"
import { CohortBadge } from "@/components/shared/CohortBadge"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { canEditOwnProfile, canEditUserProfile, canManageRole } from "@/lib/auth"
import { signOut } from "@/lib/authService"
import { filterProfiles, getProfileCohortCounts, type ProfileCohortFilter } from "@/lib/profileList"
import { fetchProfiles, updateMyProfile, updateProfileRole, updateUserProfile } from "@/lib/profiles"
import { authStore, useAuthStore } from "@/store/authStore"
import type { Profile } from "@/types/auth"

export function AccountSection() {
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [cohortFilter, setCohortFilter] = useState<ProfileCohortFilter>("all")
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [editingMyProfile, setEditingMyProfile] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void fetchProfiles().then((items) => { if (active) setProfiles(items) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "无法读取用户列表。") })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 3200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const counts = useMemo(() => getProfileCohortCounts(profiles), [profiles])
  const visibleProfiles = useMemo(() => filterProfiles(profiles, cohortFilter, search), [profiles, cohortFilter, search])

  if (!user || !profile) return null

  const changeRole = async (target: Profile, role: "user" | "admin") => {
    setUpdatingId(target.id)
    setError(null)
    try {
      const updated = await updateProfileRole(target.id, role)
      setProfiles((items) => items.map((item) => item.id === updated.id ? updated : item))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "角色更新失败。")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleSignOut = async () => {
    const result = await signOut()
    if (result.error) setError(result.error)
  }
  const saveProfile = async (username: string, title: string) => { if (!editingProfile) return; const updated = await updateUserProfile(editingProfile.id, username, title); setProfiles((items) => items.map((item) => item.id === updated.id ? updated : item)) }
  const saveMyProfile = async (username: string, title: string) => {
    const updated = await updateMyProfile(username, title)
    authStore.getState().updateProfile(updated)
    setProfiles((items) => items.some((item) => item.id === updated.id) ? items.map((item) => item.id === updated.id ? updated : item) : [updated, ...items])
    setNotice("个人资料已更新")
  }

  const emptyText = search.trim() ? "没有找到匹配的用户" : cohortFilter === 2024 ? "暂无24级用户" : cohortFilter === 2025 ? "这里还没有25级同学" : "正在读取用户列表…"

  return <section className="mt-5 rounded-[20px] border bg-card p-4 shadow-xs" aria-labelledby="account-title">
    <h3 id="account-title" className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-primary" />账户</h3>
    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/35 p-3"><UserAvatar id={profile.id} name={profile.username} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="truncate text-sm font-semibold">{profile.username}</p><CohortBadge year={profile.cohortYear} /><RoleBadge role={profile.role} /></div>{profile.title && <p className="mt-1 truncate text-xs text-muted-foreground">{profile.title}</p>}<p className="mt-1 truncate text-xs text-muted-foreground">{user.email ?? "未提供邮箱"}</p></div></div>
    <Button className="mt-3 w-full" disabled={!canEditOwnProfile(profile)} variant="outline" onClick={() => setEditingMyProfile(true)}><Pencil />编辑资料</Button>
    <Button className="mt-3 w-full" variant="outline" onClick={handleSignOut}><LogOut />退出登录</Button>

    <div className="mt-5 border-t pt-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold"><UsersRound className="size-4 text-primary" />同学列表 / 用户管理</h4>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">按账号所属年级筛选，不影响当前查看的课程表年级。</p>
      <Tabs className="mt-3" onValueChange={(value) => setCohortFilter(value === "all" ? "all" : Number(value) as ProfileCohortFilter)} value={String(cohortFilter)}><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="all">全部 {counts.all}</TabsTrigger><TabsTrigger value="2024">24级 {counts.cohort2024}</TabsTrigger><TabsTrigger value="2025">25级 {counts.cohort2025}</TabsTrigger></TabsList></Tabs>
      <div className="relative mt-3"><Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="搜索用户" className="h-11 pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="搜索用户" value={search} /></div>
      <div className="mt-3 space-y-2">
        {visibleProfiles.map((item) => {
          const manageable = canManageRole(profile, item)
          const isUpdating = updatingId === item.id
          return <div key={item.id} className="flex min-w-0 items-start gap-3 rounded-2xl border border-border/70 p-3"><UserAvatar id={item.id} name={item.username} /><div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-1.5"><p className="min-w-0 truncate text-sm font-medium">{item.username}</p><CohortBadge year={item.cohortYear} /><RoleBadge role={item.role} /></div>{item.title && <p className="mt-1 truncate text-xs text-muted-foreground">{item.title}</p>}{item.cohortYear === null && <p className="mt-1 text-xs text-muted-foreground">未设置年级</p>}{(manageable || canEditUserProfile(profile, item)) && <div className="mt-2 flex flex-wrap gap-2">{canEditUserProfile(profile, item) && <Button aria-label={`编辑 ${item.username} 的资料`} size="sm" variant="outline" onClick={() => setEditingProfile(item)}><Pencil />编辑资料</Button>}{manageable && <><Button disabled={isUpdating || item.role === "admin"} size="sm" onClick={() => changeRole(item, "admin")}>设为管理员</Button><Button disabled={isUpdating || item.role === "user"} size="sm" variant="secondary" onClick={() => changeRole(item, "user")}>取消管理员</Button></>}</div>}</div></div>
        })}
        {visibleProfiles.length === 0 && !error && <p className="rounded-2xl border bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">{emptyText}</p>}
      </div>
    </div>
    {error && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive" role="alert">{error}</p>}
    <ProfileEditSheet key={editingProfile?.id} open={editingProfile !== null} profile={editingProfile} onOpenChange={(open) => { if (!open) setEditingProfile(null) }} onSave={saveProfile} />
    <ProfileEditSheet key={`self-${profile.id}-${profile.username}-${profile.title ?? ""}`} open={editingMyProfile} profile={profile} sheetTitle="编辑我的资料" onOpenChange={setEditingMyProfile} onSave={saveMyProfile} />
    {notice && <p className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[60] mx-auto max-w-sm rounded-2xl border bg-card px-4 py-3 text-center text-sm shadow-md" role="status">{notice}</p>}
  </section>
}
