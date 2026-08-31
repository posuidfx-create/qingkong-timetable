import { useState } from "react"
import { Check, Languages } from "lucide-react"

import type { AppLocale } from "@/i18n/locale"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/lib/utils"

export function LanguageMenu({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const options: Array<{ value: AppLocale; label: string }> = [
    { value: "zh-CN", label: t("language.zh") },
    { value: "ja-JP", label: t("language.ja") },
  ]

  return <div className="language-menu relative">
    <button aria-expanded={open} aria-label={t("utility.language")} className={cn("workspace-utility-button", !compact && "min-w-10")} onClick={() => setOpen((current) => !current)} type="button">
      <Languages aria-hidden="true" className="size-[18px]" />
      <span className={compact ? "sr-only" : "hidden xl:inline"}>{t(locale === "zh-CN" ? "language.currentZh" : "language.currentJa")}</span>
    </button>
    {open && <div className="language-popover absolute right-0 top-[calc(100%+0.5rem)] z-50 w-44 rounded-2xl border p-2 shadow-lg" role="menu" aria-label={t("utility.language")}>
      <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("utility.language")}</p>
      {options.map((option) => <button className="flex min-h-11 w-full items-center justify-between rounded-xl px-2.5 text-sm hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60" key={option.value} role="menuitemradio" aria-checked={locale === option.value} onClick={() => { setLocale(option.value); setOpen(false) }} type="button"><span>{option.label}</span>{locale === option.value && <Check aria-hidden="true" className="size-4 text-primary" />}</button>)}
    </div>}
  </div>
}
