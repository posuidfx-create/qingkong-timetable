import { Fragment, useState } from "react"
import { ChevronLeft, ChevronDown, History, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { APP_VERSION } from "@/constants/appVersion"
import { changelog, changelogJa, type ChangelogChangeType } from "@/data/changelog"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/useI18n"
import type { TranslationKey } from "@/i18n/translations.zh-CN"

const changeLabelKeys: Record<ChangelogChangeType, TranslationKey> = { new: "changelog.typeNew", improved: "changelog.typeImproved", fixed: "changelog.typeFixed", security: "changelog.typeSecurity" }
const changeStyles: Record<ChangelogChangeType, string> = { new: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200", improved: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200", fixed: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200", security: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200" }

export function ChangelogPage({ onBack }: { onBack: () => void }) {
  const { locale, t } = useI18n()
  const entries = locale === "ja-JP" ? changelogJa : changelog
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (version: string) => setExpanded((versions) => {
    const next = new Set(versions)
    if (next.has(version)) next.delete(version)
    else next.add(version)
    return next
  })
  return <section className="mx-auto w-full max-w-xl pb-8" aria-labelledby="changelog-title"><button className="flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground" onClick={onBack} type="button"><ChevronLeft className="size-4" />{t("changelog.title")}</button><div className="mt-3 rounded-[24px] border bg-card p-5 shadow-xs"><div className="flex items-start justify-between gap-3"><div><div className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary"><History className="size-5" /></div><h2 id="changelog-title" className="mt-3 text-2xl font-semibold">{t("brand.name")}</h2><p className="mt-1 text-sm font-medium text-primary">v{APP_VERSION}</p></div><Sparkles className="size-5 text-primary/60" /></div><p className="mt-4 whitespace-pre-line text-xs leading-5 text-muted-foreground">{t("changelog.schoolDescription")}</p><p className="mt-4 text-sm leading-6">{t("changelog.description")}</p></div><div className="relative mt-6 space-y-5 before:absolute before:top-3 before:bottom-3 before:left-[9px] before:w-px before:bg-border">{entries.map((entry) => { const isExpanded = expanded.has(entry.version); const visible = entry.major || isExpanded ? entry.changes : entry.changes.slice(0, 4); return <article className="relative pl-7" key={entry.version}><span className={cn("absolute top-2 left-0 flex size-5 items-center justify-center rounded-full border-4 border-background", entry.isCurrent ? "bg-primary" : "bg-secondary")}></span><div className={cn("rounded-[20px] border bg-card p-4 shadow-xs", entry.major && "changelog-major-entry")}><div className="flex flex-wrap items-center gap-2"><h3 className="min-w-0 text-base font-semibold">v{entry.version} · {entry.title}</h3>{entry.major && <span className="rounded-full border border-primary/25 bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">{t("changelog.major")}</span>}{entry.isCurrent && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">{t("changelog.current")}</span>}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">{entry.description}</p><ul className="mt-3 space-y-2">{visible.map((change, index) => <Fragment key={change.text}>{change.group && (index === 0 || visible[index - 1]?.group !== change.group) ? <li className="pt-2 text-xs font-semibold text-foreground first:pt-0">{change.group}</li> : null}<li className="flex items-start gap-2 text-xs leading-5"><span className={cn("mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium", changeStyles[change.type])}>{t(changeLabelKeys[change.type])}</span><span>{change.text}</span></li></Fragment>)}</ul>{!entry.major && entry.changes.length > 4 && <Button className="mt-3 w-full" onClick={() => toggle(entry.version)} size="sm" variant="secondary">{isExpanded ? t("changelog.collapse") : t("changelog.expand")}<ChevronDown className={cn("transition-transform duration-150", isExpanded && "rotate-180")} /></Button>}</div></article> })}</div></section>
}
