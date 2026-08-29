import { useEffect, useState } from "react"
import { LogOut, ShieldCheck, UsersRound } from "lucide-react"

import { RoleBadge } from "@/components/profile/RoleBadge"
import { CohortBadge } from "@/components/shared/CohortBadge"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { Button } from "@/components/ui/button"
import { canManageRole } from "@/lib/auth"
import { signOut } from "@/lib/authService"
import { fetchProfiles, updateProfileRole } from "@/lib/profiles"
import { useAuthStore } from "@/store/authStore"
import type { Profile } from "@/types/auth"

export function AccountSection() {
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void fetchProfiles()
      .then((items) => { if (active) setProfiles(items) })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "无法读取用户列表。") })
    return () => { active = false }
  }, [])

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

  return (
    <section className="mt-5 rounded-[20px] border bg-card p-4 shadow-xs" aria-labelledby="account-title">
      <h3 id="account-title" className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-primary" />账户</h3>
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/35 p-3">
        <UserAvatar id={profile.id} name={profile.username} />
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="truncate text-sm font-semibold">{profile.username}</p><CohortBadge year={profile.cohortYear} /><RoleBadge role={profile.role} /></div><p className="mt-1 truncate text-xs text-muted-foreground">{user.email ?? "未提供邮箱"}</p></div>
      </div>
      <Button className="mt-3 w-full" variant="outline" onClick={handleSignOut}><LogOut />退出登录</Button>

      <div className="mt-5 border-t pt-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold"><UsersRound className="size-4 text-primary" />同学列表 / 用户管理</h4>
        <p className="mt-1 text-xs text-muted-foreground">查看同学基础资料；管理员权限由数据库规则实际保护。</p>
        <div className="mt-3 space-y-2">
          {profiles.map((item) => {
            const manageable = canManageRole(profile, item)
            const isUpdating = updatingId === item.id
            return <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border/70 p-3"><UserAvatar id={item.id} name={item.username} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="truncate text-sm font-medium">{item.username}</p><CohortBadge year={item.cohortYear} /><RoleBadge role={item.role} /></div>{manageable && <div className="mt-2 flex flex-wrap gap-2"><Button disabled={isUpdating || item.role === "admin"} size="sm" onClick={() => changeRole(item, "admin")}>设为管理员</Button><Button disabled={isUpdating || item.role === "user"} size="sm" variant="secondary" onClick={() => changeRole(item, "user")}>取消管理员</Button></div>}</div></div>
          })}
          {profiles.length === 0 && !error && <p className="py-2 text-center text-xs text-muted-foreground">正在读取用户列表…</p>}
        </div>
      </div>
      {error && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive" role="alert">{error}</p>}
    </section>
  )
}
