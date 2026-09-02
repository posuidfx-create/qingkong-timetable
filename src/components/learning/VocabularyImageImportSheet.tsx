import { useMemo, useRef, useState } from "react"
import { Camera, ImagePlus, LoaderCircle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { LEARNING_AI_ENABLED } from "@/constants/features"
import { useI18n } from "@/i18n/useI18n"
import { getJapaneseLessonVolume, MINNA_NO_NIHONGO_KEY } from "@/lib/japaneseLessons"
import { createEditableImportedWords, extractVocabularyFromImage, importVocabularyWordsForLesson, type EditableImportedWord, VocabularyImageImportError } from "@/lib/vocabularyImageImport"
import { buildVocabularyImageReviewDraftKey, clearVocabularyImageReviewDraft, createVocabularyImageFingerprint, resolveVocabularyImageReviewHydration, saveVocabularyImageReviewDraft, type VocabularyImageReviewContext, type VocabularyImageReviewDraft } from "@/lib/vocabularyImageReviewDraft"
import { useAuthStore } from "@/store/authStore"
import type { VocabularyWord } from "@/types/vocabulary"

interface Props {
  lessonNumber: number
  onImported: (words: VocabularyWord[]) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  words: readonly VocabularyWord[]
}

export function VocabularyImageImportSheet({ lessonNumber, onImported, open, onOpenChange, words }: Props) {
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const context = useMemo<VocabularyImageReviewContext | null>(() => userId ? ({ userId, textbookKey: MINNA_NO_NIHONGO_KEY, volume: getJapaneseLessonVolume(lessonNumber), lessonNumber }) : null, [lessonNumber, userId])
  if (!context) return null
  return <VocabularyImageImportSheetReady context={context} key={buildVocabularyImageReviewDraftKey(context)} lessonNumber={lessonNumber} onImported={onImported} onOpenChange={onOpenChange} open={open} words={words} />
}

interface ReadyProps extends Props {
  context: VocabularyImageReviewContext
}

function VocabularyImageImportSheetReady({ context, lessonNumber, onImported, open, onOpenChange, words }: ReadyProps) {
  const { t } = useI18n()
  const [hydration] = useState(() => resolveVocabularyImageReviewHydration(context))
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const draftMeta = useRef<Pick<VocabularyImageReviewDraft, "createdAt" | "imageFingerprint"> | null>(hydration ? { createdAt: hydration.draft.createdAt, imageFingerprint: hydration.draft.imageFingerprint } : null)
  const [file, setFile] = useState<File | null>(null)
  const [items, setItems] = useState<EditableImportedWord[]>(() => hydration?.words ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(() => hydration ? t(hydration.noticeKey) : null)
  const [restoredOpen, setRestoredOpen] = useState(() => hydration?.open ?? false)

  const persist = (nextItems: readonly EditableImportedWord[]) => {
    if (!context || !nextItems.length) return
    const saved = saveVocabularyImageReviewDraft(context, nextItems, { createdAt: draftMeta.current?.createdAt, imageFingerprint: draftMeta.current?.imageFingerprint })
    if (saved) draftMeta.current = { createdAt: saved.createdAt, imageFingerprint: saved.imageFingerprint }
  }

  const select = (next?: File) => {
    if (!next) return
    setFile(next)
    setError(null)
    setNotice(items.length ? t("vocabulary.imageReviewReplaceHint") : null)
  }

  const recognize = async () => {
    if (!file || !LEARNING_AI_ENABLED) return
    setBusy(true)
    setError(null)
    try {
      const result = await extractVocabularyFromImage(file, lessonNumber)
      const editable = createEditableImportedWords(result)
      if (!editable.length) {
        setError(t("vocabulary.imageImportEmpty"))
        return
      }
      const imageFingerprint = await createVocabularyImageFingerprint(file).catch(() => null)
      const saved = context ? saveVocabularyImageReviewDraft(context, editable, { imageFingerprint }) : null
      draftMeta.current = saved ? { createdAt: saved.createdAt, imageFingerprint: saved.imageFingerprint } : null
      setItems(editable)
      setNotice(null)
    } catch (reason) {
      const code = reason instanceof VocabularyImageImportError ? reason.code : "vision_failed"
      setError(t(code === "unsupported_image" ? "vocabulary.imageImportUnsupported" : code === "invalid_image_size" ? "vocabulary.imageImportTooLarge" : "vocabulary.imageImportFailed"))
    } finally { setBusy(false) }
  }

  const update = (id: string, patch: Partial<EditableImportedWord>) => {
    setItems((current) => {
      const next = current.map((item) => item.id === id ? { ...item, ...patch } : item)
      persist(next)
      return next
    })
  }

  const clearDraft = () => {
    clearVocabularyImageReviewDraft(context)
    draftMeta.current = null
    setItems([])
    setFile(null)
    setError(null)
    setNotice(null)
    setRestoredOpen(false)
  }

  const cancelImport = () => {
    clearDraft()
    onOpenChange(false)
  }

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await importVocabularyWordsForLesson(items, words, lessonNumber)
      onImported(result.created)
      setNotice(t("vocabulary.imageImportResult", { created: result.created.length, existing: result.existing.length, failed: result.failed.length }))
      if (result.failed.length) {
        setItems(result.failed)
        persist(result.failed)
      } else {
        clearVocabularyImageReviewDraft(context)
        draftMeta.current = null
        setItems([])
        setFile(null)
        setError(null)
        setTimeout(() => {
          setRestoredOpen(false)
          onOpenChange(false)
        }, 500)
      }
    } finally { setBusy(false) }
  }

  const selectedCount = items.filter((item) => item.selected).length
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setRestoredOpen(false)
    onOpenChange(nextOpen)
  }
  return <Sheet onOpenChange={handleOpenChange} open={open || restoredOpen}>
    <SheetContent className="responsive-bottom-sheet flex max-h-[92dvh] flex-col rounded-t-[28px]" side="bottom">
      <SheetHeader><SheetTitle>{t("vocabulary.imageImport")}</SheetTitle><SheetDescription>{t("vocabulary.imageImportDescription", { lesson: lessonNumber })}</SheetDescription></SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28">
        <div className="grid grid-cols-2 gap-2"><Button className="min-h-11" onClick={() => cameraInput.current?.click()} variant="outline"><Camera className="size-4" />{t("vocabulary.takePhoto")}</Button><Button className="min-h-11" onClick={() => fileInput.current?.click()} variant="outline"><ImagePlus className="size-4" />{t("vocabulary.chooseImage")}</Button></div>
        <p className="mt-2 text-xs text-muted-foreground">{t("vocabulary.imageTemporary")}</p>
        <input accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" className="hidden" onChange={(event) => { select(event.target.files?.[0]); event.currentTarget.value = "" }} ref={cameraInput} type="file" />
        <input accept="image/jpeg,image/png,image/webp,image/gif,.heic,.heif" className="hidden" onChange={(event) => { select(event.target.files?.[0]); event.currentTarget.value = "" }} ref={fileInput} type="file" />
        {file ? <div className="mt-3 flex min-w-0 items-center justify-between border-y py-3"><span className="min-w-0 truncate text-sm">{file.name}</span><Button disabled={busy} onClick={() => void recognize()} size="sm">{busy ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : items.length ? <RefreshCw className="size-4" /> : null}{t(items.length ? "vocabulary.recognizeAgain" : "vocabulary.startRecognize")}</Button></div> : null}
        {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-primary" role="status">{notice}</p> : null}
        {items.length ? <div className="mt-4 divide-y border-y"><header className="flex items-center justify-between py-3"><strong>{t("vocabulary.recognitionResult")}</strong><span className="text-xs text-muted-foreground">{t("vocabulary.recognizedCount", { count: items.length })}</span></header>{items.map((item) => <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2 py-3" key={item.id}><div className="flex justify-center pt-2"><input aria-label={item.term} checked={item.selected} className="size-5 accent-primary" onChange={(event) => update(item.id, { selected: event.target.checked })} type="checkbox" /></div><div className="min-w-0 space-y-2"><Input aria-label={t("vocabulary.term")} onChange={(event) => update(item.id, { term: event.target.value })} value={item.term} /><div className="grid grid-cols-2 gap-2"><Input aria-label={t("vocabulary.reading")} onChange={(event) => update(item.id, { reading: event.target.value })} value={item.reading} /><Input aria-label={t("vocabulary.meaning")} onChange={(event) => update(item.id, { meanings: [event.target.value] })} value={item.meanings.join("；")} /></div>{item.confidence < 0.75 || item.warnings.length ? <p className="text-xs text-amber-700 dark:text-amber-300">{t("vocabulary.needsConfirmation")} · {Math.round(item.confidence * 100)}%</p> : null}</div></div>)}</div> : null}
      </div>
      {items.length ? <div className="absolute inset-x-0 bottom-0 grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t bg-background px-4 py-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]"><Button disabled={busy} onClick={cancelImport} variant="outline">{t("vocabulary.cancelImport")}</Button><Button disabled={busy || !selectedCount} onClick={() => void save()}>{t("vocabulary.addToLesson", { count: selectedCount })}</Button></div> : null}
    </SheetContent>
  </Sheet>
}
