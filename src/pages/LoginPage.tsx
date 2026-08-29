import { useState, type FormEvent } from "react"

import { AuthCard } from "@/components/auth/AuthCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signInWithPassword } from "@/lib/authService"

export function LoginPage({ onRegister }: { onRegister: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setPending(true); setError(null)
    try { const result = await signInWithPassword(email.trim(), password); if (result.error) setError(result.error) } catch (reason) { setError(reason instanceof Error ? reason.message : "登录失败。") } finally { setPending(false) }
  }
  return <AuthCard title="欢迎回来" description="课程、待办与同学交流，都在这里。"><form className="mt-6 space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="login-email">邮箱</Label><Input autoComplete="email" id="login-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></div><div className="space-y-2"><Label htmlFor="login-password">密码</Label><Input autoComplete="current-password" id="login-password" minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></div>{error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}<Button className="h-11 w-full" disabled={pending} type="submit">{pending ? "正在登录…" : "登录"}</Button></form><p className="mt-5 text-center text-sm text-muted-foreground">还没有账号？<button className="ml-1 min-h-11 text-primary underline-offset-4 hover:underline" onClick={onRegister} type="button">去注册</button></p></AuthCard>
}
