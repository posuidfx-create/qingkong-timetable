import { useState, type FormEvent } from "react"

import { AuthCard } from "@/components/auth/AuthCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signUpWithPassword } from "@/lib/authService"

export function RegisterPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setPending(true); setError(null); setMessage(null); try { const result = await signUpWithPassword(email.trim(), password, username.trim()); if (result.error) setError(result.error); else setMessage(result.needsEmailConfirmation ? "注册成功，请前往邮箱完成验证后登录。" : "注册成功，正在进入课表。") } catch (reason) { setError(reason instanceof Error ? reason.message : "注册失败。") } finally { setPending(false) } }
  return <AuthCard title="加入晴空课表" description="国际教育学院（中外合作办学）的校园学习生活小助手。所属年级决定年级聊天室和待办；课表仍可自由查看 24 / 25 级。"><form className="mt-6 space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="register-username">用户名</Label><Input autoComplete="nickname" id="register-username" maxLength={40} onChange={(event) => setUsername(event.target.value)} required value={username} /></div><div className="space-y-2"><Label htmlFor="register-email">邮箱</Label><Input autoComplete="email" id="register-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></div><div className="space-y-2"><Label htmlFor="register-password">密码</Label><Input autoComplete="new-password" id="register-password" minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></div>{error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}{message && <p className="rounded-xl bg-primary/10 p-3 text-sm text-primary" role="status">{message}</p>}<Button className="h-11 w-full" disabled={pending} type="submit">{pending ? "正在注册…" : "注册"}</Button></form><p className="mt-5 text-center text-sm text-muted-foreground">已有账号？<button className="ml-1 min-h-11 text-primary underline-offset-4 hover:underline" onClick={onLogin} type="button">去登录</button></p></AuthCard>
}
