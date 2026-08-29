import { useEffect, useRef, useState } from "react"
import { Download, Sparkles } from "lucide-react"
import { registerSW } from "virtual:pwa-register"

import { Button } from "@/components/ui/button"
import { applyPwaUpdate, dismissPwaUpdatePrompt, showPwaUpdatePrompt, type PwaUpdatePromptState } from "@/lib/pwaUpdate"

export function PwaUpdatePrompt() {
  const [state, setState] = useState<PwaUpdatePromptState>("hidden")
  const updateServiceWorker = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    let registration: ServiceWorkerRegistration | undefined
    const checkForUpdate = () => { void registration?.update().catch(() => undefined) }
    const onVisibilityChange = () => { if (document.visibilityState === "visible") checkForUpdate() }
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setState(showPwaUpdatePrompt())
      },
      onRegisteredSW(_scriptUrl, nextRegistration) {
        registration = nextRegistration
        checkForUpdate()
        updateServiceWorker.current = updateSW
      },
    })
    updateServiceWorker.current = updateSW
    window.addEventListener("focus", checkForUpdate)
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.removeEventListener("focus", checkForUpdate)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  if (state === "hidden") return null
  return <aside aria-live="polite" className="fixed inset-x-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 mx-auto w-auto max-w-sm rounded-[22px] border bg-card p-4 shadow-lg md:bottom-6 md:left-auto md:right-6 md:mx-0"><div className="flex gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary"><Sparkles className="size-5" /></div><div className="min-w-0"><h2 className="text-sm font-semibold">发现新版本</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">晴空课表有新的版本可用，更新后即可使用最新功能。</p></div></div><div className="mt-4 flex items-center justify-end gap-2"><Button onClick={() => setState(dismissPwaUpdatePrompt())} size="sm" variant="ghost">稍后</Button><Button aria-label="立即更新到新版本" onClick={() => { const update = updateServiceWorker.current; if (update) void applyPwaUpdate(update) }} size="sm"><Download />立即更新</Button></div></aside>
}
