import { useState } from "react"
import { ChevronLeft, ChevronDown, History, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { APP_VERSION } from "@/constants/appVersion"
import { changelog, type ChangelogChangeType } from "@/data/changelog"
import { cn } from "@/lib/utils"

const changeLabels: Record<ChangelogChangeType, string> = { new: "新增", improved: "优化", fixed: "修复", security: "安全" }
const changeStyles: Record<ChangelogChangeType, string> = { new: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200", improved: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200", fixed: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200", security: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200" }

export function ChangelogPage({ onBack }: { onBack: () => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (version: string) => setExpanded((versions) => {
    const next = new Set(versions)
    if (next.has(version)) next.delete(version)
    else next.add(version)
    return next
  })
  return <section className="mx-auto w-full max-w-md pb-8" aria-labelledby="changelog-title"><button className="flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground" onClick={onBack} type="button"><ChevronLeft className="size-4" />更新日志</button><div className="mt-3 rounded-[24px] border bg-card p-5 shadow-xs"><div className="flex items-start justify-between gap-3"><div><div className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary"><History className="size-5" /></div><h2 id="changelog-title" className="mt-3 text-2xl font-semibold">晴空课表</h2><p className="mt-1 text-sm font-medium text-primary">v{APP_VERSION}</p></div><Sparkles className="size-5 text-primary/60" /></div><p className="mt-4 text-xs leading-5 text-muted-foreground">大连东软信息学院<br />国际教育学院（中外合作办学）<br />校园学习生活辅助工具</p><p className="mt-4 text-sm leading-6">记录晴空课表一路以来的变化。</p></div><div className="relative mt-6 space-y-5 before:absolute before:top-3 before:bottom-3 before:left-[9px] before:w-px before:bg-border">{changelog.map((entry) => { const isExpanded = expanded.has(entry.version); const visible = isExpanded ? entry.changes : entry.changes.slice(0, 4); return <article className="relative pl-7" key={entry.version}><span className={cn("absolute top-2 left-0 flex size-5 items-center justify-center rounded-full border-4 border-background", entry.isCurrent ? "bg-primary" : "bg-secondary")}></span><div className="rounded-[20px] border bg-card p-4 shadow-xs"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold whitespace-nowrap">v{entry.version} · {entry.title}</h3>{entry.isCurrent && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">当前版本</span>}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">{entry.description}</p><ul className="mt-3 space-y-2">{visible.map((change) => <li className="flex items-start gap-2 text-xs leading-5" key={change.text}><span className={cn("mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium", changeStyles[change.type])}>{changeLabels[change.type]}</span><span>{change.text}</span></li>)}</ul>{entry.changes.length > 4 && <Button className="mt-3 w-full" onClick={() => toggle(entry.version)} size="sm" variant="secondary">{isExpanded ? "收起更新" : "查看全部更新"}<ChevronDown className={cn("transition-transform duration-150", isExpanded && "rotate-180")} /></Button>}</div></article> })}</div></section>
}
