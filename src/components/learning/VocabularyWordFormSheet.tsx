import { useEffect, useRef, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/useI18n"
import { detectVocabularyLanguage } from "@/lib/vocabulary"
import { getJapaneseLessonVolume, getLessonNumberFromPath, getLessonsForVolume, MINNA_NO_NIHONGO_KEY } from "@/lib/japaneseLessons"
import type { LearningCourseOption } from "@/lib/learningLibrary"
import type { JapaneseTextbookVolume, VocabularyLanguage, VocabularyMastery, VocabularyWord, VocabularyWordDraft } from "@/types/vocabulary"

interface VocabularyWordFormSheetProps {
  courseOptions: readonly LearningCourseOption[]
  initialTerm?: string
  onOpenChange: (open: boolean) => void
  onSave: (draft: VocabularyWordDraft) => Promise<void>
  open: boolean
  word?: VocabularyWord | null
  initialLessonNumber?: number | null
}

export function VocabularyWordFormSheet({ courseOptions, initialLessonNumber = null, initialTerm = "", onOpenChange, onSave, open, word }: VocabularyWordFormSheetProps) {
  const { t } = useI18n()
  const effectiveInitialLessonNumber = initialLessonNumber ?? (typeof window === "undefined" ? null : getLessonNumberFromPath(window.location.pathname))
  const [term, setTerm] = useState(word?.term ?? initialTerm)
  const [language, setLanguage] = useState<VocabularyLanguage>(word?.language ?? detectVocabularyLanguage(initialTerm))
  const [reading, setReading] = useState(word?.reading ?? "")
  const [meaning, setMeaning] = useState(word?.meaning ?? "")
  const [notes, setNotes] = useState(word?.notes ?? "")
  const [courseName, setCourseName] = useState(word?.courseName ?? "")
  const [mastery, setMastery] = useState<VocabularyMastery>(word?.mastery ?? "new")
  const [volume, setVolume] = useState<JapaneseTextbookVolume | "">(word?.volume ?? (effectiveInitialLessonNumber ? getJapaneseLessonVolume(effectiveInitialLessonNumber) : ""))
  const [lessonNumber, setLessonNumber] = useState<number | null>(word?.lessonNumber ?? effectiveInitialLessonNumber)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const languageEdited = useRef(Boolean(word))

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      setTerm(word?.term ?? initialTerm)
      setLanguage(word?.language ?? detectVocabularyLanguage(initialTerm))
      setReading(word?.reading ?? "")
      setMeaning(word?.meaning ?? "")
      setNotes(word?.notes ?? "")
      setCourseName(word?.courseName ?? "")
      setMastery(word?.mastery ?? "new")
      setVolume(word?.volume ?? (effectiveInitialLessonNumber ? getJapaneseLessonVolume(effectiveInitialLessonNumber) : ""))
      setLessonNumber(word?.lessonNumber ?? effectiveInitialLessonNumber)
      setError(null)
      languageEdited.current = Boolean(word)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [effectiveInitialLessonNumber, initialTerm, open, word])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!term.trim()) { setError(t("vocabulary.termRequired")); return }
    setSaving(true); setError(null)
    const course = courseOptions.find((option) => option.name === courseName.trim())
    try {
      await onSave({ term: term.trim(), language, reading, meaning, notes, courseName, courseKey: course?.key ?? "", textbookKey: lessonNumber ? MINNA_NO_NIHONGO_KEY : "", volume: lessonNumber ? getJapaneseLessonVolume(lessonNumber) : "", lessonNumber, mastery })
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error && reason.message === "duplicate" ? t("vocabulary.duplicate") : t("vocabulary.saveFailed"))
    } finally { setSaving(false) }
  }

  const availableLessons = volume ? getLessonsForVolume(volume) : []
  return <Sheet onOpenChange={onOpenChange} open={open}><SheetContent className="responsive-bottom-sheet max-h-[92dvh] rounded-t-[28px]" side="bottom"><SheetHeader><SheetTitle>{t(word ? "vocabulary.editWord" : "vocabulary.addWord")}</SheetTitle><SheetDescription>{t("vocabulary.formDescription")}</SheetDescription></SheetHeader><form className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]" onSubmit={submit}><div><Label htmlFor="vocabulary-term">{t("vocabulary.term")}</Label><Input autoFocus className="mt-2 h-11" id="vocabulary-term" maxLength={160} onChange={(event) => { const value = event.target.value; setTerm(value); if (!languageEdited.current) setLanguage(detectVocabularyLanguage(value)) }} value={term} /></div><div><Label>{t("vocabulary.language")}</Label><Select onValueChange={(value) => { languageEdited.current = true; setLanguage(value as VocabularyLanguage) }} value={language}><SelectTrigger aria-label={t("vocabulary.language")} className="mt-2 h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ja-JP">日本語</SelectItem><SelectItem value="en-US">English (US)</SelectItem><SelectItem value="en-GB">English (UK)</SelectItem><SelectItem value="zh-CN">中文</SelectItem></SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="vocabulary-reading">{t("vocabulary.reading")}</Label><Input className="mt-2 h-11" id="vocabulary-reading" maxLength={160} onChange={(event) => setReading(event.target.value)} value={reading} /></div><div><Label htmlFor="vocabulary-meaning">{t("vocabulary.meaning")}</Label><Input className="mt-2 h-11" id="vocabulary-meaning" maxLength={1000} onChange={(event) => setMeaning(event.target.value)} value={meaning} /></div></div><div className="grid gap-4 sm:grid-cols-2"><div><Label>{t("vocabulary.textbookVolume")}</Label><Select onValueChange={(value) => { if (value === "unclassified") { setVolume(""); setLessonNumber(null); return }; const next = value as "beginner_1" | "beginner_2"; setVolume(next); if (lessonNumber === null || getJapaneseLessonVolume(lessonNumber) !== next) setLessonNumber(getLessonsForVolume(next)[0] ?? null) }} value={volume || "unclassified"}><SelectTrigger className="mt-2 h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unclassified">{t("vocabulary.unclassified")}</SelectItem><SelectItem value="beginner_1">{t("vocabulary.beginnerOne")}</SelectItem><SelectItem value="beginner_2">{t("vocabulary.beginnerTwo")}</SelectItem></SelectContent></Select></div><div><Label>{t("vocabulary.lesson")}</Label><Select disabled={!volume} onValueChange={(value) => setLessonNumber(Number(value))} value={lessonNumber?.toString() ?? ""}><SelectTrigger className="mt-2 h-11 w-full"><SelectValue placeholder={t("vocabulary.unclassified")} /></SelectTrigger><SelectContent>{availableLessons.map((lesson) => <SelectItem key={lesson} value={String(lesson)}>{t("vocabulary.lessonNumber", { lesson })}</SelectItem>)}</SelectContent></Select></div></div><div><Label htmlFor="vocabulary-course">{t("vocabulary.course")}</Label><Input className="mt-2 h-11" id="vocabulary-course" list="vocabulary-course-options" maxLength={160} onChange={(event) => setCourseName(event.target.value)} value={courseName} /><datalist id="vocabulary-course-options">{courseOptions.map((option) => <option key={option.key} value={option.name} />)}</datalist></div><div><Label>{t("vocabulary.mastery")}</Label><Select onValueChange={(value) => setMastery(value as VocabularyMastery)} value={mastery}><SelectTrigger aria-label={t("vocabulary.mastery")} className="mt-2 h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">{t("vocabulary.masteryNew")}</SelectItem><SelectItem value="learning">{t("vocabulary.masteryLearning")}</SelectItem><SelectItem value="mastered">{t("vocabulary.masteryMastered")}</SelectItem></SelectContent></Select></div><div><Label htmlFor="vocabulary-notes">{t("vocabulary.notes")}</Label><Textarea className="mt-2 min-h-24" id="vocabulary-notes" maxLength={2000} onChange={(event) => setNotes(event.target.value)} value={notes} /></div>{error ? <p className="rounded-none border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p> : null}<div className="flex gap-2"><Button className="h-11 flex-1" onClick={() => onOpenChange(false)} type="button" variant="outline">{t("common.cancel")}</Button><Button className="h-11 flex-1" disabled={saving} type="submit">{saving ? t("common.saving") : t("common.save")}</Button></div></form></SheetContent></Sheet>
}
