import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react"
import { Camera, FileAudio, FileText, ImagePlus, Paperclip, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/useI18n"
import { LearningDraftPreviewStore, learningDraftFilesForUpload, type LearningDraftFile } from "@/lib/learningPreview"
import { appendLearningAssetDrafts, LearningValidationError, MAX_LEARNING_ASSETS } from "@/lib/learningRecords"
import type { LearningAsset, LearningRecord, LearningRecordDraft } from "@/types/learning"

export interface LearningCourseFormOption { key: string; name: string }

const formatSize = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`

function DraftFile({ file, onRemove }: { file: LearningDraftFile; onRemove: () => void }) {
  const { draft, previewUrl } = file
  const Icon = draft.type === "audio" ? FileAudio : draft.type === "document" ? FileText : ImagePlus
  return <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/35 bg-background/35 p-2.5">
    {previewUrl ? <img alt="" className="size-12 shrink-0 rounded-xl object-cover" src={previewUrl} /> : <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span>}
    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{draft.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{formatSize(draft.size)}</span></span>
    <button aria-label={`移除 ${draft.name}`} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" onClick={onRemove} type="button"><X className="size-4" /></button>
  </div>
}

function ExistingFile({ asset, removed, onToggle }: { asset: LearningAsset; removed: boolean; onToggle: () => void }) {
  return <div className={`flex min-w-0 items-center gap-3 rounded-2xl border p-2.5 ${removed ? "opacity-45" : "bg-background/35"}`}>
    <Paperclip className="ml-2 size-4 shrink-0 text-primary" /><span className={`min-w-0 flex-1 truncate text-sm ${removed ? "line-through" : ""}`}>{asset.originalName}</span>
    <button className="min-h-11 shrink-0 px-2 text-xs text-primary" onClick={onToggle} type="button">{removed ? "恢复" : "移除"}</button>
  </div>
}

function errorText(error: unknown, t: ReturnType<typeof useI18n>["t"]): string {
  if (!(error instanceof LearningValidationError)) return t("learning.saveFailed")
  const keys = { unsupported_type: "learning.unsupportedType", empty_file: "learning.emptyFile", image_too_large: "learning.imageTooLarge", document_too_large: "learning.documentTooLarge", audio_too_large: "learning.audioTooLarge", too_many_assets: "learning.tooManyAssets", content_required: "learning.contentRequired", course_required: "learning.courseRequired" } as const
  return t(keys[error.code as keyof typeof keys] ?? "learning.saveFailed")
}

export interface LearningRecordFormValue { draft: LearningRecordDraft; files: File[]; removedAssetIds: string[] }

export function LearningRecordFormSheet({ open, record, courseOptions, initialCourse, onOpenChange, onSave }: { open: boolean; record: LearningRecord | null; courseOptions: readonly LearningCourseFormOption[]; initialCourse?: LearningCourseFormOption | null; onOpenChange: (open: boolean) => void; onSave: (value: LearningRecordFormValue) => Promise<void> }) {
  const { t } = useI18n()
  const today = new Date(); const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  const [recordDate, setRecordDate] = useState(record?.recordDate ?? localDate); const [type, setType] = useState<LearningRecordDraft["type"]>(record?.type === "class" || initialCourse ? "class" : "daily"); const [courseName, setCourseName] = useState(record?.courseName ?? initialCourse?.name ?? ""); const [title, setTitle] = useState(record?.title ?? ""); const [content, setContent] = useState(record?.content ?? ""); const [moodNote, setMoodNote] = useState(record?.moodNote ?? ""); const [files, setFiles] = useState<LearningDraftFile[]>([]); const [removedAssetIds, setRemovedAssetIds] = useState<string[]>([]); const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false)
  const cameraInput = useRef<HTMLInputElement>(null); const galleryInput = useRef<HTMLInputElement>(null); const fileInput = useRef<HTMLInputElement>(null)
  const [previewStore] = useState(() => new LearningDraftPreviewStore(URL))
  const pendingReleases = useRef<LearningDraftFile[]>([])
  useEffect(() => { const pending = pendingReleases.current.splice(0); for (const file of pending) previewStore.release(file) }, [files, previewStore])
  useEffect(() => () => previewStore.releaseAll(), [previewStore])
  const addFiles = (incoming: FileList | File[]) => { try { const existing = (record?.assets.length ?? 0) - removedAssetIds.length + files.length; const drafts = appendLearningAssetDrafts(existing, incoming); const additions = drafts.map((draft) => previewStore.create(draft)); setFiles((items) => [...items, ...additions]); setError(null) } catch (reason) { setError(errorText(reason, t)) } }
  const removeFile = (id: string) => { const removed = files.find((item) => item.id === id); if (removed) pendingReleases.current.push(removed); setFiles((items) => items.filter((item) => item.id !== id)) }
  const clearFiles = () => { pendingReleases.current.push(...files); setFiles([]) }
  const handleDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); addFiles(event.dataTransfer.files) }
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(null); const selected = courseOptions.find((option) => option.name.trim().toLocaleLowerCase() === courseName.trim().toLocaleLowerCase()); try { await onSave({ draft: { recordDate, type, courseName, courseKey: selected?.key ?? (record?.courseName === courseName ? record.courseKey ?? "" : ""), title, content, moodNote }, files: learningDraftFilesForUpload(files), removedAssetIds }); clearFiles(); onOpenChange(false) } catch (reason) { setError(errorText(reason, t)) } finally { setSaving(false) } }
  const accept = ".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp3,.m4a,.wav,.webm,.ogg"
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="responsive-bottom-sheet max-h-[94dvh] rounded-t-[30px]" side="bottom"><SheetHeader><SheetTitle>{t(record ? "learning.editRecord" : "learning.newRecord")}</SheetTitle><SheetDescription>{t("learning.privacy")}</SheetDescription></SheetHeader><form className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]" onSubmit={submit}>
    <div><Label htmlFor="learning-date">{t("learning.recordDate")}</Label><Input className="mt-2 h-11" id="learning-date" onChange={(event) => setRecordDate(event.target.value)} required type="date" value={recordDate} /></div>
    <fieldset><legend className="text-sm font-medium">{t("learning.recordType")}</legend><div className="mt-2 grid grid-cols-2 gap-2">{(["daily", "class"] as const).map((item) => <button aria-pressed={type === item} className={`min-h-11 rounded-2xl border px-3 text-sm font-medium ${type === item ? "border-primary/45 bg-primary/15 text-primary" : "bg-background/30"}`} key={item} onClick={() => setType(item)} type="button">{t(item === "daily" ? "learning.typeDaily" : "learning.typeClass")}</button>)}</div></fieldset>
    {type === "class" && <div><Label htmlFor="learning-course">{t("learning.course")}</Label><Input className="mt-2 h-11" id="learning-course" list="learning-course-options" maxLength={160} onChange={(event) => setCourseName(event.target.value)} placeholder={t("learning.coursePlaceholder")} value={courseName} /><datalist id="learning-course-options">{courseOptions.map((option) => <option key={option.key} value={option.name} />)}</datalist></div>}
    <div><Label htmlFor="learning-title-input">{t("learning.titleOptional")}</Label><Input className="mt-2 h-11" id="learning-title-input" maxLength={120} onChange={(event) => setTitle(event.target.value)} value={title} /></div>
    <div><Label htmlFor="learning-content">{t("learning.content")}</Label><Textarea className="mt-2 min-h-32 resize-y" id="learning-content" maxLength={20000} onChange={(event) => setContent(event.target.value)} placeholder={t("learning.contentPlaceholder")} value={content} /></div>
    <div><Label htmlFor="learning-mood">{t("learning.moodNote")}</Label><Textarea className="mt-2 min-h-20 resize-y" id="learning-mood" maxLength={500} onChange={(event) => setMoodNote(event.target.value)} value={moodNote} /></div>
    <section aria-labelledby="learning-assets-label"><Label id="learning-assets-label">{t("learning.addMaterials")}</Label><div className="mt-2 rounded-3xl border border-dashed border-primary/35 bg-primary/5 p-3" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}><div className="grid grid-cols-3 gap-2"><Button className="min-h-11 px-2 text-xs" onClick={() => cameraInput.current?.click()} type="button" variant="outline"><Camera className="size-4" />{t("learning.takePhoto")}</Button><Button className="min-h-11 px-2 text-xs" onClick={() => galleryInput.current?.click()} type="button" variant="outline"><ImagePlus className="size-4" />{t("learning.choosePhotos")}</Button><Button className="min-h-11 px-2 text-xs" onClick={() => fileInput.current?.click()} type="button" variant="outline"><Paperclip className="size-4" />{t("learning.chooseFiles")}</Button></div><p className="mt-3 text-center text-xs leading-5 text-muted-foreground">{t("learning.dropHint")}<br />{t("learning.assetLimits")}</p><input accept="image/*" capture="environment" className="hidden" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = "" }} ref={cameraInput} type="file" /><input accept="image/*" className="hidden" multiple onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = "" }} ref={galleryInput} type="file" /><input accept={accept} className="hidden" multiple onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = "" }} ref={fileInput} type="file" /></div>
      <div className="mt-2 space-y-2">{record?.assets.map((asset) => <ExistingFile asset={asset} key={asset.id} onToggle={() => setRemovedAssetIds((ids) => ids.includes(asset.id) ? ids.filter((id) => id !== asset.id) : [...ids, asset.id])} removed={removedAssetIds.includes(asset.id)} />)}{files.map((file) => <DraftFile file={file} key={file.id} onRemove={() => removeFile(file.id)} />)}</div><p className="mt-3 text-xs leading-5 text-muted-foreground">{t("learning.privacy")} · {Math.max(0, (record?.assets.length ?? 0) - removedAssetIds.length + files.length)}/{MAX_LEARNING_ASSETS}</p></section>
    {error && <p className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}<Button className="h-12 w-full rounded-2xl" disabled={saving} type="submit">{saving ? t("learning.saving") : t("learning.saveRecord")}</Button>
  </form></SheetContent></Sheet>
}
