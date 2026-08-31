import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, BookMarked, BookOpen, Download, FileAudio, FileText, Languages, LoaderCircle, Paperclip, Plus, Sparkles, Trophy } from "lucide-react"

import { LearningRecordFormSheet, type LearningRecordFormValue } from "@/components/learning/LearningRecordFormSheet"
import { LearningAssetAnalysis } from "@/components/learning/LearningAssetAnalysis"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { LEARNING_AI_ENABLED } from "@/constants/features"
import { getVisibleCourses } from "@/data/builtinTimetables"
import { useI18n } from "@/i18n/useI18n"
import { learningCards } from "@/lib/learning"
import { analyzeLearningRecord, getLearningAnalysisAction, isLearningAssetAiSupported, LearningAnalysisError, markLearningAssetsProcessing } from "@/lib/learningAnalysis"
import { getCourseRecordCounts, sortLearningRecords } from "@/lib/learningRecords"
import { getLearningViewFromPath, learningViewPaths, type LearningView } from "@/lib/learningNavigation"
import { createLearningRecord, deleteLearningRecord, fetchLearningRecords, getLearningAssetUrl, LearningServiceError, updateLearningRecord } from "@/lib/learningService"
import { useTimetableStore } from "@/store/timetableStore"
import type { LearningAsset, LearningRecord } from "@/types/learning"
import type { TranslationKey } from "@/i18n/translations.zh-CN"

const cardKeys: Record<(typeof learningCards)[number]["title"], { title: TranslationKey; description: TranslationKey }> = {
  "今日记录": { title: "learning.today", description: "learning.todayDescription" }, "课程档案": { title: "learning.archive", description: "learning.archiveDescription" }, "单词本": { title: "learning.words", description: "learning.wordsDescription" }, "学习成果": { title: "learning.outcomes", description: "learning.outcomesDescription" }, "成长时间线": { title: "learning.timeline", description: "learning.timelineDescription" },
}
const viewByCard: Partial<Record<(typeof learningCards)[number]["title"], LearningView>> = { "今日记录": "today", "课程档案": "archive", "成长时间线": "timeline" }
const formatDate = (date: string, locale: string) => new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`))
const formatBytes = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`
const withCount = (template: string, count: number) => template.replace("{count}", String(count))

function LearningAssetLink({ asset }: { asset: LearningAsset }) {
  const { t } = useI18n(); const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { let active = true; void getLearningAssetUrl(asset).then((value) => { if (active) setUrl(value) }).catch(() => undefined); return () => { active = false } }, [asset])
  const Icon = asset.type === "audio" ? FileAudio : asset.type === "document" ? FileText : Paperclip
  return <a aria-disabled={!url} className={`flex min-w-0 items-center gap-2 rounded-xl border bg-background/25 px-3 py-2 text-xs ${url ? "hover:bg-primary/8" : "pointer-events-none opacity-55"}`} href={url ?? undefined} rel="noreferrer" target="_blank"><Icon className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{asset.originalName}</span><span className="shrink-0 text-muted-foreground">{formatBytes(asset.fileSize)}</span><Download aria-label={t("learning.viewAsset")} className="size-3.5 shrink-0" /></a>
}

function RecordCard({ record, analyzing, onAnalyze, onEdit, onDelete }: { record: LearningRecord; analyzing: boolean; onAnalyze: () => void; onEdit: () => void; onDelete: () => void }) {
  const { locale, t } = useI18n()
  const action = LEARNING_AI_ENABLED ? getLearningAnalysisAction(record.assets, analyzing) : null
  return <article className="workspace-window overflow-hidden p-4 sm:p-5"><header className="flex min-w-0 items-start gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-medium text-primary">{formatDate(record.recordDate, locale)}</p><h3 className="mt-1 line-clamp-2 text-base font-semibold">{record.title || (record.type === "class" ? record.courseName : t("learning.typeDaily"))}</h3>{record.courseName && <p className="mt-1 truncate text-xs text-muted-foreground">{record.courseName}</p>}</div><div className="flex shrink-0 gap-1"><Button className="min-h-11 px-3" onClick={onEdit} size="sm" variant="ghost">{t("common.edit")}</Button><Button className="min-h-11 px-3 text-destructive" onClick={onDelete} size="sm" variant="ghost">{t("common.delete")}</Button></div></header>{record.content && <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-foreground/85">{record.content}</p>}{record.moodNote && <p className="mt-3 border-l-2 border-primary/35 pl-3 text-xs leading-6 text-muted-foreground">{record.moodNote}</p>}{record.assets.length > 0 && <div className="mt-4 space-y-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-muted-foreground">{withCount(t("learning.assetsCount"), record.assets.length)}</p>{action && <Button className="min-h-10 rounded-xl px-3" disabled={action === "processing"} onClick={onAnalyze} size="sm"><Sparkles className="size-3.5" />{t(action === "processing" ? "learning.aiProcessing" : action === "rerun" ? "learning.aiRerun" : "learning.aiAnalyze")}</Button>}</div>{record.assets.map((asset) => <div className="rounded-2xl border bg-background/20 p-2" key={asset.id}><LearningAssetLink asset={asset} />{LEARNING_AI_ENABLED && <LearningAssetAnalysis asset={asset} />}</div>)}</div>}</article>
}

function analysisErrorKey(code: string | undefined): TranslationKey {
  if (code === "gemini_not_configured" || code === "not_configured") return "learning.aiNotConfigured"
  if (code === "auth_required") return "learning.aiAuthRequired"
  if (code === "forbidden") return "learning.aiForbidden"
  if (code === "record_not_found") return "learning.aiRecordMissing"
  if (code === "storage_not_found") return "learning.aiStorageMissing"
  if (code === "file_too_large") return "learning.aiFileTooLarge"
  if (code === "gemini_auth_failed") return "learning.aiBackendAuthFailed"
  if (code === "gemini_quota") return "learning.aiQuota"
  if (code === "gemini_timeout") return "learning.aiTimeout"
  if (code === "invalid_ai_response") return "learning.aiInvalidResult"
  if (code === "network_failed") return "learning.aiNetworkFailed"
  return "learning.aiRequestFailed"
}

export function LearningPage() {
  const { t } = useI18n(); const userCourses = useTimetableStore((state) => state.courses); const cohortYear = useTimetableStore((state) => state.settings.cohortYear)
  const [view, setView] = useState<LearningView>(() => getLearningViewFromPath(window.location.pathname)); const [records, setRecords] = useState<LearningRecord[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null); const [formOpen, setFormOpen] = useState(false); const [editing, setEditing] = useState<LearningRecord | null>(null); const [deleting, setDeleting] = useState<LearningRecord | null>(null); const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(() => new Set())
  const load = useCallback(async () => { setLoading(true); try { setRecords(await fetchLearningRecords()); setError(null) } catch { setError(t("learning.loadFailed")) } finally { setLoading(false) } }, [t])
  useEffect(() => { let active = true; void fetchLearningRecords().then((items) => { if (active) { setRecords(items); setError(null) } }).catch(() => { if (active) setError(t("learning.loadFailed")) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [t]); useEffect(() => { const pop = () => setView(getLearningViewFromPath(window.location.pathname)); window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop) }, [])
  const navigate = (next: LearningView) => { setView(next); const path = learningViewPaths[next]; if (window.location.pathname !== path) window.history.pushState(null, "", path) }
  const sorted = useMemo(() => sortLearningRecords(records), [records]); const courseCounts = useMemo(() => getCourseRecordCounts(records), [records]); const courseNames = useMemo(() => [...new Set(getVisibleCourses(cohortYear, userCourses).map((course) => course.name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [cohortYear, userCourses])
  const save = async ({ draft, files, removedAssetIds }: LearningRecordFormValue) => { const saved = editing ? await updateLearningRecord(editing, draft, files, removedAssetIds) : await createLearningRecord(draft, files); setRecords((items) => editing ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]); setNotice(t(editing ? "learning.updateSuccess" : "learning.createSuccess")); setEditing(null) }
  const confirmDelete = async () => { if (!deleting) return; try { await deleteLearningRecord(deleting); setRecords((items) => items.filter((item) => item.id !== deleting.id)); setNotice(t("learning.deleteSuccess")); setDeleting(null) } catch (reason) { setError(t(reason instanceof LearningServiceError && (reason.code === "asset_delete_failed" || reason.code === "record_load_failed") ? "learning.deleteStorageFailed" : "learning.saveFailed")) } }
  const analyze = async (record: LearningRecord) => {
    if (!LEARNING_AI_ENABLED) return
    if (!record.assets.some(isLearningAssetAiSupported) || analyzingIds.has(record.id)) return
    setAnalyzingIds((ids) => new Set(ids).add(record.id)); setRecords((items) => items.map((item) => item.id === record.id ? markLearningAssetsProcessing(item) : item)); setError(null)
    try {
      const result = await analyzeLearningRecord(record.id); setRecords((items) => items.map((item) => item.id === record.id ? result.record : item))
      if (result.failed > 0) setError(t(analysisErrorKey(result.results.find((item) => item.status === "failed")?.errorCode)))
      else setNotice(t("learning.aiSuccess"))
    } catch (reason) {
      try { const refreshed = await fetchLearningRecords(); setRecords(refreshed) } catch { /* retain the current list and surface the analysis error */ }
      setError(t(analysisErrorKey(reason instanceof LearningAnalysisError ? reason.code : undefined)))
    } finally { setAnalyzingIds((ids) => { const next = new Set(ids); next.delete(record.id); return next }) }
  }
  const openNew = () => { setEditing(null); setFormOpen(true) }; const openEdit = (record: LearningRecord) => { setEditing(record); setFormOpen(true) }
  const title = view === "today" ? t("learning.today") : view === "archive" ? t("learning.archive") : view === "timeline" ? t("learning.timeline") : t("learning.title")
  return <section className="learning-water-space workspace-page-grid mx-auto w-full max-w-7xl pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" aria-labelledby="learning-title"><div className="workspace-window learning-main-window overflow-hidden">
    <header className="learning-water-intro p-5 sm:p-6"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0">{view !== "hub" && <button className="mb-3 flex min-h-11 items-center gap-2 text-sm text-muted-foreground" onClick={() => navigate("hub")} type="button"><ArrowLeft className="size-4" />{t("common.back")}</button>}<p className="text-xs font-semibold tracking-wide text-primary">{t("brand.name")}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight" id="learning-title">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{view === "today" ? t("learning.todayTagline") : view === "timeline" ? t("learning.timelineIntro") : t("brand.description")}</p></div>{view === "today" && <Button className="min-h-11 shrink-0 rounded-2xl" onClick={openNew}><Plus className="size-4" />{t("learning.newRecord")}</Button>}</div></header>
    {notice && <p className="mx-4 mt-4 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary" role="status">{notice}</p>}{error && <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive" role="alert"><span>{error}</span><Button onClick={() => void load()} size="sm" variant="outline">{t("common.retry")}</Button></div>}
    {view === "hub" ? <div className="learning-water-list m-4 sm:m-5">{learningCards.map(({ icon: Icon, title: cardTitle }, index) => { const keys = cardKeys[cardTitle]; const target = viewByCard[cardTitle]; const active = Boolean(target); return <button aria-label={t(keys.title)} className="learning-water-item group flex min-h-[4.75rem] w-full touch-manipulation items-center gap-3 border-b px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60" key={cardTitle} onClick={() => active ? navigate(target!) : setNotice(`${t(keys.title)}：${t("learning.notice")}`)} type="button"><span className="text-xs tabular-nums text-primary">{String(index + 1).padStart(2, "0")}</span><span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t(keys.title)}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{t(keys.description)}</span></span><span className="text-xs text-primary">{active ? "→" : t("common.comingSoon")}</span></button> })}</div> : view === "archive" ? <div className="space-y-3 p-4 sm:p-5">{courseCounts.length ? courseCounts.map((item) => <div className="flex min-h-16 items-center gap-3 rounded-2xl border bg-background/25 px-4" key={item.courseName}><BookOpen className="size-5 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{item.courseName}</span><span className="shrink-0 text-xs text-muted-foreground">{withCount(t("learning.recordsCount"), item.count)}</span></div>) : <EmptyState text={t("learning.archiveEmpty")} />}</div> : <div className="space-y-3 p-4 sm:p-5">{loading ? <Loading /> : sorted.length ? sorted.map((record) => <RecordCard analyzing={analyzingIds.has(record.id)} key={record.id} onAnalyze={() => void analyze(record)} onDelete={() => setDeleting(record)} onEdit={() => openEdit(record)} record={record} />) : <EmptyState text={t("learning.emptyHint")} />}</div>}
  </div><aside className="learning-context-stack"><section className="workspace-window learning-context-window"><p className="workspace-window-kicker">PRIVATE ARCHIVE</p><h3 className="mt-2 text-lg font-medium">{t("learning.privacy")}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{withCount(t("learning.recordsCount"), records.length)}</p></section><section className="workspace-window learning-context-window"><p className="workspace-window-kicker">LEARNING</p><div className="mt-3 grid gap-2">{[[BookMarked, "learning.today"], [BookOpen, "learning.archive"], [Languages, "learning.words"], [Trophy, "learning.outcomes"], [Sparkles, "learning.timeline"]].map(([Icon, key]) => { const Component = Icon as typeof BookOpen; return <div className="flex min-h-11 items-center gap-3 border-b text-sm" key={key as string}><Component className="size-4 text-primary" /><span>{t(key as TranslationKey)}</span></div> })}</div></section></aside>
  {formOpen && <LearningRecordFormSheet courseNames={courseNames} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null) }} onSave={save} open record={editing} />}<AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("learning.deleteTitle")}</AlertDialogTitle><AlertDialogDescription>{t("learning.deleteDescription")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => void confirmDelete()} variant="destructive">{t("common.delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>
}

function EmptyState({ text }: { text: string }) { return <div className="rounded-3xl border border-dashed p-8 text-center"><BookMarked className="mx-auto size-6 text-primary" /><p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p></div> }
function Loading() { return <div className="flex min-h-40 items-center justify-center text-muted-foreground"><LoaderCircle className="mr-2 size-4 animate-spin motion-reduce:animate-none" />Loading</div> }
