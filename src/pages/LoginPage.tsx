import { useState, type FormEvent } from "react"

import { AuthCard } from "@/components/auth/AuthCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { signInWithPassword } from "@/lib/authService"
import { useI18n } from "@/i18n/useI18n"

export function LoginPage({ onRegister }: { onRegister: () => void }) {
  const { t } = useI18n()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setPending(true); setError(null)
    try { const result = await signInWithPassword(email.trim(), password, rememberMe); if (result.error) setError(result.error) } catch (reason) { setError(reason instanceof Error ? reason.message : t("common.error")) } finally { setPending(false) }
  }
  return <AuthCard title={t("auth.welcome")} description={t("auth.welcomeDescription")}><form className="mt-6 space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="login-email">{t("auth.email")}</Label><Input autoComplete="email" id="login-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></div><div className="space-y-2"><Label htmlFor="login-password">{t("auth.password")}</Label><Input autoComplete="current-password" id="login-password" minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></div><label className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-muted/45 px-3 text-sm"><span><span className="font-medium">{t("auth.remember")}</span><span className="mt-0.5 block text-xs text-muted-foreground">{t("auth.rememberDescription")}</span></span><Switch checked={rememberMe} onCheckedChange={setRememberMe} /></label>{error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}<Button className="h-11 w-full" disabled={pending} type="submit">{pending ? t("auth.loggingIn") : t("auth.login")}</Button></form><p className="mt-5 text-center text-sm text-muted-foreground">{t("auth.noAccount")}<button className="ml-1 min-h-11 text-primary underline-offset-4 hover:underline" onClick={onRegister} type="button">{t("auth.goRegister")}</button></p></AuthCard>
}
