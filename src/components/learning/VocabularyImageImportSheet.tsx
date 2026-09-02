import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Camera, CheckCircle2, ImagePlus, LoaderCircle, RefreshCw, Scissors, Undo2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { LEARNING_AI_ENABLED } from "@/constants/features"
import { useI18n } from "@/i18n/useI18n"
import { getJapaneseLessonVolume, MINNA_NO_NIHONGO_KEY } from "@/lib/japaneseLessons"
import { clearVocabularyImportBatch, loadVocabularyImportBatch, saveVocabularyImportBatch, undoVocabularyImportBatch, type VocabularyImportBatch } from "@/lib/vocabularyImportBatch"
import { createEditableImportedWords, decideVocabularyDefaultSelection, extractVocabularyFromImage, findVocabularyCoverageGapTileIndexes, importVocabularyWordsForLesson, type EditableImportedWord, type VocabularyReviewRisk, VocabularyImageImportError } from "@/lib/vocabularyImageImport"
import { buildVocabularyImageReviewDraftKey, clearVocabularyImageReviewDraft, createVocabularyImageFingerprint, resolveVocabularyImageReviewHydration, saveVocabularyImageReviewDraft, type VocabularyImageReviewContext, type VocabularyImageReviewDraft } from "@/lib/vocabularyImageReviewDraft"
import type { VocabularyCropRect, VocabularyImageQuality } from "@/lib/vocabularyImageTiling"
import { useAuthStore } from "@/store/authStore"
import type { VocabularyWord } from "@/types/vocabulary"

interface Props { lessonNumber: number; onImported: (words: VocabularyWord[]) => void; onRemoved: (ids: readonly string[]) => void; open: boolean; onOpenChange: (open: boolean) => void; words: readonly VocabularyWord[] }
interface ReadyProps extends Props { context: VocabularyImageReviewContext }
interface CropPercent { left: number; top: number; right: number; bottom: number }
const DEFAULT_CROP: CropPercent = { left: 0, top: 0, right: 100, bottom: 100 }

function CropPreview({ crop, file }: { crop: CropPercent; file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return <div className="relative mx-auto mt-3 w-fit max-w-full overflow-hidden border bg-muted"><img alt="" className="block max-h-56 max-w-full object-contain" src={url} /><div className="pointer-events-none absolute border-2 border-primary bg-primary/10" style={{ left: `${crop.left}%`, top: `${crop.top}%`, right: `${100 - crop.right}%`, bottom: `${100 - crop.bottom}%` }} /></div>
}

export function VocabularyImageImportSheet(props: Props) {
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const context = useMemo<VocabularyImageReviewContext | null>(() => userId ? ({ userId, textbookKey: MINNA_NO_NIHONGO_KEY, volume: getJapaneseLessonVolume(props.lessonNumber), lessonNumber: props.lessonNumber }) : null, [props.lessonNumber, userId])
  if (!context) return null
  return <VocabularyImageImportSheetReady {...props} context={context} key={buildVocabularyImageReviewDraftKey(context)} />
}

function VocabularyImageImportSheetReady({ context, lessonNumber, onImported, onRemoved, open, onOpenChange, words }: ReadyProps) {
  const { t } = useI18n(); const [hydration] = useState(() => resolveVocabularyImageReviewHydration(context)); const fileInput = useRef<HTMLInputElement>(null); const cameraInput = useRef<HTMLInputElement>(null)
  const draftMeta = useRef<Pick<VocabularyImageReviewDraft, "createdAt" | "imageFingerprint"> | null>(hydration ? { createdAt: hydration.draft.createdAt, imageFingerprint: hydration.draft.imageFingerprint } : null)
  const batchContext = useMemo(() => ({ userId: context.userId, lessonNumber, volume: context.volume }), [context.userId, context.volume, lessonNumber])
  const [file, setFile] = useState<File | null>(null); const [items, setItems] = useState<EditableImportedWord[]>(() => hydration?.words ?? []); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(() => hydration ? t(hydration.noticeKey) : null); const [restoredOpen, setRestoredOpen] = useState(() => hydration?.open ?? false)
  const [cropMode, setCropMode] = useState(false); const [crop, setCrop] = useState<CropPercent>(DEFAULT_CROP); const [quality, setQuality] = useState<VocabularyImageQuality | null>(null); const [allowBlurry, setAllowBlurry] = useState(false); const [serverCoverageGapTiles, setServerCoverageGapTiles] = useState<number[] | null>(null); const [batch, setBatch] = useState<VocabularyImportBatch | null>(() => loadVocabularyImportBatch(batchContext))

  const persist = (nextItems: readonly EditableImportedWord[]) => { if (!nextItems.length) return; const saved = saveVocabularyImageReviewDraft(context, nextItems, { createdAt: draftMeta.current?.createdAt, imageFingerprint: draftMeta.current?.imageFingerprint }); if (saved) draftMeta.current = { createdAt: saved.createdAt, imageFingerprint: saved.imageFingerprint } }
  const select = (next?: File) => { if (!next) return; setFile(next); setError(null); setQuality(null); setServerCoverageGapTiles(null); setAllowBlurry(false); setCrop(DEFAULT_CROP); setCropMode(false); setNotice(items.length ? t("vocabulary.imageReviewReplaceHint") : null) }
  const cropRect = (): VocabularyCropRect => ({ left: crop.left / 100, top: crop.top / 100, right: crop.right / 100, bottom: crop.bottom / 100 })
  const recognize = async () => {
    if (!file || !LEARNING_AI_ENABLED) return
    setBusy(true); setError(null)
    try {
      const result = await extractVocabularyFromImage(file, lessonNumber, cropMode ? cropRect() : undefined, allowBlurry); const editable = createEditableImportedWords(result.extraction)
      if (!editable.length) { setError(t("vocabulary.imageImportEmpty")); return }
      const imageFingerprint = await createVocabularyImageFingerprint(file).catch(() => null); const saved = saveVocabularyImageReviewDraft(context, editable, { imageFingerprint }); draftMeta.current = saved ? { createdAt: saved.createdAt, imageFingerprint: saved.imageFingerprint } : null
      setQuality(result.prepared.quality); setServerCoverageGapTiles(result.extraction.coverageGapTileIndexes); setItems(editable); setNotice(t("vocabulary.imagePartitioned", { count: result.prepared.quality.tileCount }))
    } catch (reason) { const code = reason instanceof VocabularyImageImportError ? reason.code : "vision_failed"; if (code === "image_blurry") { const prepared = reason instanceof VocabularyImageImportError && reason.cause && typeof reason.cause === "object" && "quality" in reason.cause ? reason.cause as { quality: VocabularyImageQuality } : null; setQuality(prepared?.quality ?? null); setAllowBlurry(true); setNotice(t("vocabulary.imageBlurryContinue")); setError(null) } else setError(t(code === "unsupported_image" ? "vocabulary.imageImportUnsupported" : code === "invalid_image_size" ? "vocabulary.imageImportTooLarge" : "vocabulary.imageImportFailed")) } finally { setBusy(false) }
  }
  const update = (id: string, patch: Partial<EditableImportedWord>) => setItems((current) => { const next = current.map((item) => item.id === id ? { ...item, ...patch } : item); persist(next); return next })
  const clearDraft = () => { clearVocabularyImageReviewDraft(context); draftMeta.current = null; setItems([]); setFile(null); setError(null); setNotice(null); setRestoredOpen(false); setQuality(null); setServerCoverageGapTiles(null); setCropMode(false) }
  const cancelImport = () => { clearDraft(); onOpenChange(false) }
  const save = async () => {
    setBusy(true); setError(null)
    try {
      const result = await importVocabularyWordsForLesson(items, words, lessonNumber); onImported(result.created); setNotice(t("vocabulary.imageImportResult", { created: result.created.length, existing: result.existing.length, failed: result.failed.length }))
      const nextBatch = saveVocabularyImportBatch(batchContext, result.created); setBatch(nextBatch)
      if (result.failed.length) { setItems(result.failed); persist(result.failed) } else { clearVocabularyImageReviewDraft(context); draftMeta.current = null; setItems([]); setFile(null); setError(null); setTimeout(() => { setRestoredOpen(false); onOpenChange(false) }, 500) }
    } finally { setBusy(false) }
  }
  const undoBatch = async () => {
    if (!batch) return; setBusy(true)
    try { const result = await undoVocabularyImportBatch(batch, words); if (result.deleted.length) onRemoved(result.deleted.map((word) => word.id)); if (!result.failed.length) { clearVocabularyImportBatch(batchContext); setBatch(null); setNotice(t("vocabulary.imageImportUndone", { count: result.deleted.length })) } else setError(t("vocabulary.imageImportUndoFailed")) } finally { setBusy(false) }
  }
  const selectedCount = items.filter((item) => item.selected).length
  const reviewTileCount = Math.max(3, ...items.map((item) => item.tileIndex + 1)); const coverageGapTiles = serverCoverageGapTiles ?? findVocabularyCoverageGapTileIndexes(items, reviewTileCount); const allNeedReview = Boolean(items.length) && items.every((item) => decideVocabularyDefaultSelection(item, coverageGapTiles).risk !== "reliable")
  const handleOpenChange = (nextOpen: boolean) => { if (!nextOpen) setRestoredOpen(false); onOpenChange(nextOpen) }
  const setCropValue = (key: keyof CropPercent, value: number) => { setAllowBlurry(false); setCrop((current) => ({ ...current, [key]: value })) }
  const reviewDecision = (item: EditableImportedWord) => decideVocabularyDefaultSelection(item, coverageGapTiles)
  const statusIcon = (risk: VocabularyReviewRisk) => risk === "reliable" ? <CheckCircle2 className="size-4 text-emerald-600" /> : risk === "supplement" ? <AlertTriangle className="size-4 text-amber-600" /> : <XCircle className="size-4 text-destructive" />

  return <>{batch ? <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[min(92vw,28rem)] -translate-x-1/2 items-center justify-between gap-3 border bg-background p-3 shadow-lg"><span className="text-sm">{t("vocabulary.imageImportBatch", { count: batch.createdWordIds.length })}</span><Button disabled={busy} onClick={() => void undoBatch()} size="sm" variant="outline"><Undo2 className="size-4" />{t("vocabulary.undoImport")}</Button></div> : null}<Sheet onOpenChange={handleOpenChange} open={open || restoredOpen}>
    <SheetContent className="responsive-bottom-sheet flex max-h-[92dvh] flex-col rounded-t-[28px]" side="bottom"><SheetHeader><SheetTitle>{t("vocabulary.imageImport")}</SheetTitle><SheetDescription>{t("vocabulary.imageImportDescription", { lesson: lessonNumber })}</SheetDescription></SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28"><div className="grid grid-cols-2 gap-2"><Button className="min-h-11" onClick={() => cameraInput.current?.click()} variant="outline"><Camera className="size-4" />{t("vocabulary.takePhoto")}</Button><Button className="min-h-11" onClick={() => fileInput.current?.click()} variant="outline"><ImagePlus className="size-4" />{t("vocabulary.chooseImage")}</Button></div><p className="mt-2 text-xs text-muted-foreground">{t("vocabulary.imageTemporary")}</p>
        <input accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" className="hidden" onChange={(event) => { select(event.target.files?.[0]); event.currentTarget.value = "" }} ref={cameraInput} type="file" /><input accept="image/jpeg,image/png,image/webp,image/gif,.heic,.heif" className="hidden" onChange={(event) => { select(event.target.files?.[0]); event.currentTarget.value = "" }} ref={fileInput} type="file" />
        {file ? <><div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-y py-3"><span className="min-w-0 truncate text-sm">{file.name}</span><div className="flex shrink-0 gap-2"><Button onClick={() => setCropMode((value) => !value)} size="sm" variant="outline"><Scissors className="size-4" />{t("vocabulary.cropRecognize")}</Button><Button disabled={busy} onClick={() => void recognize()} size="sm">{busy ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : items.length ? <RefreshCw className="size-4" /> : null}{t(items.length ? "vocabulary.recognizeAgain" : "vocabulary.startRecognize")}</Button></div></div>{cropMode ? <div className="border-b pb-4"><CropPreview crop={crop} file={file} /><div className="mt-3 grid grid-cols-2 gap-3 text-xs">{(["left", "right", "top", "bottom"] as const).map((key) => <label className="grid gap-1" key={key}>{t(`vocabulary.crop${key[0].toUpperCase()}${key.slice(1)}` as "vocabulary.cropLeft")}<input max={key === "left" || key === "top" ? (key === "left" ? crop.right - 5 : crop.bottom - 5) : 100} min={key === "right" ? crop.left + 5 : key === "bottom" ? crop.top + 5 : 0} onChange={(event) => setCropValue(key, Number(event.target.value))} type="range" value={crop[key]} /></label>)}</div></div> : null}</> : null}
        {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}{notice ? <p className="mt-3 text-sm text-primary" role="status">{notice}</p> : null}{quality?.blurry ? <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{t("vocabulary.imageBlurry")}</p> : null}
        {items.length ? <div className="mt-4 divide-y border-y"><header className="space-y-1 py-3"><div className="flex items-center justify-between"><strong>{t("vocabulary.recognitionResult")}</strong><span className="text-xs text-muted-foreground">{t("vocabulary.recognizedCount", { count: items.length })}</span></div>{allNeedReview ? <p className="text-xs text-muted-foreground">{t("vocabulary.allResultsNeedReview")}</p> : null}{coverageGapTiles.length ? <p className="text-xs text-amber-700 dark:text-amber-300">{t("vocabulary.coverageGap", { count: coverageGapTiles.length })}</p> : null}</header>{items.map((item) => { const decision = reviewDecision(item); return <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2 py-3" key={item.id}><div className="flex justify-center pt-2"><input aria-label={item.term} checked={item.selected} className="size-5 accent-primary" onChange={(event) => update(item.id, { selected: event.target.checked })} type="checkbox" /></div><div className="min-w-0 space-y-2"><div className="flex items-center gap-2 text-xs font-medium">{statusIcon(decision.risk)}<span>{t(decision.risk === "reliable" ? "vocabulary.recognitionReliable" : decision.risk === "supplement" ? "vocabulary.recognitionSupplement" : "vocabulary.recognitionReview")}</span></div><Input aria-label={t("vocabulary.term")} onChange={(event) => update(item.id, { term: event.target.value })} value={item.term} /><div className="grid grid-cols-2 gap-2"><Input aria-label={t("vocabulary.reading")} onChange={(event) => update(item.id, { reading: event.target.value })} placeholder={t("vocabulary.notRecognized")} value={item.reading} /><Input aria-label={t("vocabulary.meaning")} onChange={(event) => update(item.id, { meanings: event.target.value ? [event.target.value] : [] })} placeholder={t("vocabulary.notRecognized")} value={item.meanings.join("；")} /></div><p className="break-words text-xs text-muted-foreground"><strong>{t("vocabulary.sourceText")}：</strong>{item.sourceText}</p>{decision.risk === "confirm" ? <p className="text-xs text-amber-700 dark:text-amber-300">{t("vocabulary.needsConfirmation")}</p> : null}</div></div> })}</div> : null}
      </div>{items.length ? <div className="absolute inset-x-0 bottom-0 grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t bg-background px-4 py-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]"><Button disabled={busy} onClick={cancelImport} variant="outline">{t("vocabulary.cancelImport")}</Button><Button disabled={busy || !selectedCount} onClick={() => void save()}>{t("vocabulary.addToLesson", { count: selectedCount })}</Button></div> : null}
    </SheetContent></Sheet></>
}
