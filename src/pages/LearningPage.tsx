import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookMarked, BookOpen, CalendarDays, Download, FileAudio, FileText, LoaderCircle, Paperclip, Plus, Sparkles } from "lucide-react"

import { LearningAssetAnalysis } from "@/components/learning/LearningAssetAnalysis"
import { LearningMorphNavigation } from "@/components/learning/LearningMorphNavigation"
import { LearningRecordFormSheet, type LearningRecordFormValue } from "@/components/learning/LearningRecordFormSheet"
import { ReactiveSurfaceButton } from "@/components/learning/ReactiveSurfaceButton"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { LEARNING_AI_ENABLED } from "@/constants/features"
import { getVisibleCourses } from "@/data/builtinTimetables"
import type { TranslationKey } from "@/i18n/translations.zh-CN"
import { useI18n } from "@/i18n/useI18n"
import { getLearningAssetCounts, getLearningRecordHeadline, getRecentLearningRecords, getTodayCourseNames, getTodayLearningRecords, learningIndexItems } from "@/lib/learningEditorial"
import { analyzeLearningRecord, getLearningAnalysisAction, isLearningAssetAiSupported, LearningAnalysisError, markLearningAssetsProcessing } from "@/lib/learningAnalysis"
import { getCourseRecordCounts, sortLearningRecords } from "@/lib/learningRecords"
import { getLearningViewFromPath, learningViewPaths, type LearningView } from "@/lib/learningNavigation"
import { createLearningRecord, deleteLearningRecord, fetchLearningRecords, getLearningAssetUrl, LearningServiceError, updateLearningRecord } from "@/lib/learningService"
import { useTimetableStore } from "@/store/timetableStore"
import type { LearningAsset, LearningRecord } from "@/types/learning"

const formatDate = (date: string, locale: string) => new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`))
const formatTime = (date: string, locale: string) => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(date))
const formatBytes = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`
const withCount = (template: string, count: number) => template.replace("{count}", String(count))

function getLocalDateIso(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function LearningAssetLink({ asset }: { asset: LearningAsset }) {
  const { t } = useI18n()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void getLearningAssetUrl(asset).then((value) => { if (active) setUrl(value) }).catch(() => undefined)
    return () => { active = false }
  }, [asset])
  const Icon = asset.type === "audio" ? FileAudio : asset.type === "document" ? FileText : Paperclip
  return <a aria-disabled={!url} className={`learning-asset-link ${url ? "hover:bg-primary/8" : "pointer-events-none opacity-55"}`} href={url ?? undefined} rel="noreferrer" target="_blank"><Icon className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{asset.originalName}</span><span className="shrink-0 text-muted-foreground">{formatBytes(asset.fileSize)}</span><Download aria-label={t("learning.viewAsset")} className="size-3.5 shrink-0" /></a>
}

function formatAssetSummary(record: LearningRecord, t: (key: TranslationKey) => string): string {
  const counts = getLearningAssetCounts(record)
  return [
    counts.image > 0 ? `${t("learning.assetImage")} ${counts.image}` : null,
    counts.pdf > 0 ? `PDF ${counts.pdf}` : null,
    counts.document > 0 ? `${t("learning.assetDocument")} ${counts.document}` : null,
    counts.audio > 0 ? `${t("learning.assetAudio")} ${counts.audio}` : null,
  ].filter((part): part is string => Boolean(part)).join(" · ")
}

interface LearningRecordRowProps {
  analyzing: boolean
  compact?: boolean
  onAnalyze: () => void
  onDelete: () => void
  onEdit: () => void
  record: LearningRecord
}

function LearningRecordRow({ analyzing, compact = false, onAnalyze, onDelete, onEdit, record }: LearningRecordRowProps) {
  const { locale, t } = useI18n()
  const action = LEARNING_AI_ENABLED ? getLearningAnalysisAction(record.assets, analyzing) : null
  const headline = getLearningRecordHeadline(record)
  const assetSummary = formatAssetSummary(record, t)
  const primaryText = headline || assetSummary
  const typeLabel = record.type === "class" ? t("learning.typeClass") : t("learning.typeDaily")
  return <article className="learning-record-row" data-compact={compact}>
    <div className="learning-record-row__date" aria-label={formatDate(record.recordDate, locale)}><span>{record.recordDate.slice(8, 10)}</span><small>{new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(`${record.recordDate}T00:00:00`))}</small></div>
    <button className="learning-record-row__body" onClick={onEdit} type="button">
      {primaryText ? <h3 className="learning-record-row__title">{primaryText}</h3> : null}
      {record.content && headline !== record.content.trim() ? <p className="learning-record-row__preview">{record.content}</p> : null}
      {record.moodNote && !record.content ? <p className="learning-record-row__preview">{record.moodNote}</p> : null}
      <p className="learning-record-row__meta"><span>{typeLabel}</span>{record.courseName ? <span>{record.courseName}</span> : null}{headline && assetSummary ? <span>{assetSummary}</span> : null}</p>
    </button>
    <div className="learning-record-row__actions"><Button className="min-h-11 px-3" onClick={onEdit} size="sm" variant="ghost">{t("common.edit")}</Button>{!compact ? <Button className="min-h-11 px-3 text-destructive" onClick={onDelete} size="sm" variant="ghost">{t("common.delete")}</Button> : null}</div>
    {!compact && record.assets.length > 0 ? <div className="learning-record-row__assets"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-muted-foreground">{withCount(t("learning.assetsCount"), record.assets.length)}</p>{action ? <Button className="min-h-10 rounded-xl px-3" disabled={action === "processing"} onClick={onAnalyze} size="sm"><Sparkles className="size-3.5" />{t(action === "processing" ? "learning.aiProcessing" : action === "rerun" ? "learning.aiRerun" : "learning.aiAnalyze")}</Button> : null}</div>{record.assets.map((asset) => <div className="learning-record-row__asset" key={asset.id}><LearningAssetLink asset={asset} />{LEARNING_AI_ENABLED ? <LearningAssetAnalysis asset={asset} /> : null}</div>)}</div> : null}
  </article>
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
  const { locale, t } = useI18n()
  const userCourses = useTimetableStore((state) => state.courses)
  const cohortYear = useTimetableStore((state) => state.settings.cohortYear)
  const [view, setView] = useState<LearningView>(() => getLearningViewFromPath(window.location.pathname))
  const [records, setRecords] = useState<LearningRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LearningRecord | null>(null)
  const [deleting, setDeleting] = useState<LearningRecord | null>(null)
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(() => new Set())

  const load = useCallback(async () => { setLoading(true); try { setRecords(await fetchLearningRecords()); setError(null) } catch { setError(t("learning.loadFailed")) } finally { setLoading(false) } }, [t])
  useEffect(() => { let active = true; void fetchLearningRecords().then((items) => { if (active) { setRecords(items); setError(null) } }).catch(() => { if (active) setError(t("learning.loadFailed")) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [t])
  useEffect(() => { const pop = () => setView(getLearningViewFromPath(window.location.pathname)); window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop) }, [])

  const navigate = (next: LearningView) => { setView(next); const path = learningViewPaths[next]; if (window.location.pathname !== path) window.history.pushState(null, "", path) }
  const sorted = useMemo(() => sortLearningRecords(records), [records])
  const recent = useMemo(() => getRecentLearningRecords(records), [records])
  const courseCounts = useMemo(() => getCourseRecordCounts(records), [records])
  const courseNames = useMemo(() => [...new Set(getVisibleCourses(cohortYear, userCourses).map((course) => course.name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [cohortYear, userCourses])
  const todayIso = getLocalDateIso()
  const todayRecords = useMemo(() => getTodayLearningRecords(records, todayIso), [records, todayIso])
  const todayCourses = useMemo(() => getTodayCourseNames(records, todayIso), [records, todayIso])

  const save = async ({ draft, files, removedAssetIds }: LearningRecordFormValue) => { const saved = editing ? await updateLearningRecord(editing, draft, files, removedAssetIds) : await createLearningRecord(draft, files); setRecords((items) => editing ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]); setNotice(t(editing ? "learning.updateSuccess" : "learning.createSuccess")); setEditing(null) }
  const confirmDelete = async () => { if (!deleting) return; try { await deleteLearningRecord(deleting); setRecords((items) => items.filter((item) => item.id !== deleting.id)); setNotice(t("learning.deleteSuccess")); setDeleting(null) } catch (reason) { setError(t(reason instanceof LearningServiceError && (reason.code === "asset_delete_failed" || reason.code === "record_load_failed") ? "learning.deleteStorageFailed" : "learning.saveFailed")) } }
  const analyze = async (record: LearningRecord) => {
    if (!LEARNING_AI_ENABLED || !record.assets.some(isLearningAssetAiSupported) || analyzingIds.has(record.id)) return
    setAnalyzingIds((ids) => new Set(ids).add(record.id)); setRecords((items) => items.map((item) => item.id === record.id ? markLearningAssetsProcessing(item) : item)); setError(null)
    try { const result = await analyzeLearningRecord(record.id); setRecords((items) => items.map((item) => item.id === record.id ? result.record : item)); if (result.failed > 0) setError(t(analysisErrorKey(result.results.find((item) => item.status === "failed")?.errorCode))); else setNotice(t("learning.aiSuccess")) }
    catch (reason) { try { setRecords(await fetchLearningRecords()) } catch { /* retain the current list */ } setError(t(analysisErrorKey(reason instanceof LearningAnalysisError ? reason.code : undefined))) }
    finally { setAnalyzingIds((ids) => { const next = new Set(ids); next.delete(record.id); return next }) }
  }
  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (record: LearningRecord) => { setEditing(record); setFormOpen(true) }
  const title = view === "today" ? t("learning.indexToday") : view === "archive" ? t("learning.courseArchive") : view === "timeline" ? t("learning.records") : t("learning.title")

  return <section className="learning-editorial-layout mx-auto w-full max-w-7xl pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" aria-labelledby="learning-title">
    <main className="learning-reading-plane">
      <header className="learning-editorial-header">
        {view !== "hub" ? <button className="learning-back-button" onClick={() => navigate("hub")} type="button"><ArrowLeft className="size-4" />{t("common.back")}</button> : null}
        <p className="learning-editorial-eyebrow">LEARNING / 01</p><h1 id="learning-title">{title}</h1><p>{view === "today" ? t("learning.todayTagline") : view === "timeline" ? t("learning.recordsDescription") : view === "archive" ? t("learning.archiveDescription") : t("learning.editorialIntro")}</p>
        {view !== "hub" ? <LearningMorphNavigation activeView={view} onNavigate={navigate} /> : null}
      </header>
      {notice ? <p className="learning-inline-notice" role="status">{notice}</p> : null}
      {error ? <div className="learning-inline-error" role="alert"><span>{error}</span><Button onClick={() => void load()} size="sm" variant="outline">{t("common.retry")}</Button></div> : null}
      {view === "hub" ? <>
        <section className="learning-today-editorial" aria-labelledby="learning-today-heading"><SectionHeading eyebrow="TODAY" id="learning-today-heading" title={t("learning.todaySection")} /><div className="learning-today-editorial__content"><div><p className="learning-today-editorial__date">{formatDate(todayIso, locale)}</p><p className="learning-today-editorial__count">{withCount(t("learning.recordsCount"), todayRecords.length)}</p>{todayRecords[0] ? <button className="learning-today-editorial__latest" onClick={() => openEdit(todayRecords[0])} type="button"><span>{t("learning.latestRecord")} · {formatTime(todayRecords[0].updatedAt, locale)}</span><strong>{getLearningRecordHeadline(todayRecords[0]) || formatAssetSummary(todayRecords[0], t)}</strong></button> : <p className="learning-today-editorial__empty">{t("learning.todayEmpty")}</p>}{todayCourses.length ? <p className="learning-today-editorial__courses">{t("learning.todayCourses")} · {todayCourses.join(" / ")}</p> : null}</div><ReactiveSurfaceButton aria-label={t("learning.recordToday")} onClick={openNew}><Plus className="size-4" /><span>{t("learning.recordToday")}</span><ArrowRight className="size-4" /></ReactiveSurfaceButton></div></section>
        <section className="learning-editorial-index" aria-labelledby="learning-index-heading"><SectionHeading eyebrow="INDEX" id="learning-index-heading" title={t("learning.index")} /><div className="learning-editorial-index__list">{learningIndexItems.map((item) => <button className="learning-editorial-index__item" key={item.id} onClick={() => item.target ? navigate(item.target) : setNotice(`${t(item.titleKey)}：${t("learning.notice")}`)} type="button"><span className="learning-editorial-index__number">{item.number}</span><span className="learning-editorial-index__copy"><strong>{t(item.titleKey)}</strong><small>{t(item.descriptionKey)}</small></span><span className="learning-editorial-index__status">{item.target ? <ArrowRight className="size-4" /> : t("common.comingSoon")}</span></button>)}</div></section>
        <section className="learning-recent-editorial" aria-labelledby="learning-recent-heading"><div className="learning-section-heading learning-section-heading--inline"><div><p>RECENT LEARNING</p><h2 id="learning-recent-heading">{t("learning.recentLearning")}</h2></div>{records.length ? <button onClick={() => navigate("timeline")} type="button">{t("learning.viewAll")} <ArrowRight className="size-4" /></button> : null}</div>{loading ? <Loading /> : recent.length ? recent.map((record) => <LearningRecordRow analyzing={analyzingIds.has(record.id)} compact key={record.id} onAnalyze={() => void analyze(record)} onDelete={() => setDeleting(record)} onEdit={() => openEdit(record)} record={record} />) : <EmptyState text={t("learning.emptyHint")} />}</section>
      </> : view === "archive" ? <section className="learning-subpage-section">{courseCounts.length ? courseCounts.map((item, index) => <div className="learning-course-row" key={item.courseName}><span>{String(index + 1).padStart(2, "0")}</span><BookOpen className="size-5 text-primary" /><strong>{item.courseName}</strong><small>{withCount(t("learning.recordsCount"), item.count)}</small></div>) : <EmptyState text={t("learning.archiveEmpty")} />}</section> : <section className="learning-subpage-section">{loading ? <Loading /> : sorted.length ? sorted.map((record) => <LearningRecordRow analyzing={analyzingIds.has(record.id)} key={record.id} onAnalyze={() => void analyze(record)} onDelete={() => setDeleting(record)} onEdit={() => openEdit(record)} record={record} />) : <EmptyState text={t("learning.emptyHint")} />}</section>}
    </main>
    <aside className="learning-context-rail" aria-label={t("learning.contextRail")}><div className="learning-context-plane"><section><p className="learning-context-plane__kicker">TODAY</p><h2>{t("learning.todayContext")}</h2><strong>{todayRecords.length}</strong><span>{t("learning.recordsUnit")}</span><p>{todayCourses.length ? todayCourses.join(" / ") : t("learning.todayEmpty")}</p></section><section><p className="learning-context-plane__kicker">RECENT</p><h2>{t("learning.recentLearning")}</h2><div className="learning-context-plane__recent">{recent.slice(0, 3).map((record) => <button key={record.id} onClick={() => openEdit(record)} type="button"><span>{record.recordDate.slice(5).replace("-", "/")}</span><strong>{getLearningRecordHeadline(record) || formatAssetSummary(record, t)}</strong></button>)}{!recent.length ? <p>{t("learning.empty")}</p> : null}</div></section><section><p className="learning-context-plane__kicker">NEXT</p><h2>{t("learning.nextSteps")}</h2><button onClick={() => navigate("timeline")} type="button"><CalendarDays className="size-4" />{t("learning.records")}<ArrowRight className="ml-auto size-4" /></button><button onClick={() => navigate("archive")} type="button"><BookOpen className="size-4" />{t("learning.courseArchive")}<ArrowRight className="ml-auto size-4" /></button></section></div></aside>
    {formOpen ? <LearningRecordFormSheet courseNames={courseNames} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null) }} onSave={save} open record={editing} /> : null}
    <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("learning.deleteTitle")}</AlertDialogTitle><AlertDialogDescription>{t("learning.deleteDescription")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => void confirmDelete()} variant="destructive">{t("common.delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>
}

function SectionHeading({ eyebrow, id, title }: { eyebrow: string; id: string; title: string }) { return <div className="learning-section-heading"><p>{eyebrow}</p><h2 id={id}>{title}</h2></div> }
function EmptyState({ text }: { text: string }) { return <div className="learning-empty-state"><BookMarked className="size-6 text-primary" /><p>{text}</p></div> }
function Loading() { return <div className="learning-loading"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />Loading</div> }
