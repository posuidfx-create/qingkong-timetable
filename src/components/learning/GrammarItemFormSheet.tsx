import { useEffect, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/useI18n"
import { getJapaneseLessonVolume, MINNA_NO_NIHONGO_KEY } from "@/lib/japaneseLessons"
import type { GrammarItem, GrammarItemDraft, VocabularyMastery } from "@/types/vocabulary"

interface Props {
  item: GrammarItem | null
  lessonNumber: number
  onOpenChange: (open: boolean) => void
  onSave: (draft: GrammarItemDraft) => Promise<void>
  open: boolean
}

export function GrammarItemFormSheet({ item, lessonNumber, onOpenChange, onSave, open }: Props) {
  const { t } = useI18n()
  const [pattern, setPattern] = useState("")
  const [meaning, setMeaning] = useState("")
  const [connection, setConnection] = useState("")
  const [usageNote, setUsageNote] = useState("")
  const [example, setExample] = useState("")
  const [exampleTranslation, setExampleTranslation] = useState("")
  const [personalNote, setPersonalNote] = useState("")
  const [mastery, setMastery] = useState<VocabularyMastery>("new")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      setPattern(item?.pattern ?? "")
      setMeaning(item?.meaning ?? "")
      setConnection(item?.connection ?? "")
      setUsageNote(item?.usageNote ?? "")
      setExample(item?.example ?? "")
      setExampleTranslation(item?.exampleTranslation ?? "")
      setPersonalNote(item?.personalNote ?? "")
      setMastery(item?.mastery ?? "new")
      setError(null)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [item, open])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!pattern.trim()) { setError(t("vocabulary.grammarPatternRequired")); return }
    setSaving(true); setError(null)
    try {
      await onSave({ textbookKey: MINNA_NO_NIHONGO_KEY, volume: getJapaneseLessonVolume(lessonNumber), lessonNumber, pattern, meaning, connection, usageNote, example, exampleTranslation, personalNote, mastery })
      onOpenChange(false)
    } catch { setError(t("vocabulary.grammarSaveFailed")) }
    finally { setSaving(false) }
  }

  return <Sheet onOpenChange={onOpenChange} open={open}><SheetContent className="responsive-bottom-sheet max-h-[92dvh] rounded-t-[28px]" side="bottom"><SheetHeader><SheetTitle>{t(item ? "vocabulary.editGrammar" : "vocabulary.addGrammar")}</SheetTitle><SheetDescription>{t("vocabulary.grammarFormDescription", { lesson: lessonNumber })}</SheetDescription></SheetHeader><form className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]" onSubmit={submit}><div><Label htmlFor="grammar-pattern">{t("vocabulary.grammarPattern")}</Label><Input autoFocus className="mt-2 h-11" id="grammar-pattern" maxLength={240} onChange={(event) => setPattern(event.target.value)} value={pattern} /></div><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="grammar-meaning">{t("vocabulary.meaning")}</Label><Textarea className="mt-2 min-h-20" id="grammar-meaning" maxLength={2000} onChange={(event) => setMeaning(event.target.value)} value={meaning} /></div><div><Label htmlFor="grammar-connection">{t("vocabulary.grammarConnection")}</Label><Textarea className="mt-2 min-h-20" id="grammar-connection" maxLength={2000} onChange={(event) => setConnection(event.target.value)} value={connection} /></div></div><div><Label htmlFor="grammar-usage">{t("vocabulary.grammarUsage")}</Label><Textarea className="mt-2 min-h-24" id="grammar-usage" maxLength={4000} onChange={(event) => setUsageNote(event.target.value)} value={usageNote} /></div><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="grammar-example">{t("vocabulary.grammarExample")}</Label><Textarea className="mt-2 min-h-20" id="grammar-example" maxLength={2000} onChange={(event) => setExample(event.target.value)} value={example} /></div><div><Label htmlFor="grammar-example-translation">{t("vocabulary.grammarExampleTranslation")}</Label><Textarea className="mt-2 min-h-20" id="grammar-example-translation" maxLength={2000} onChange={(event) => setExampleTranslation(event.target.value)} value={exampleTranslation} /></div></div><div><Label htmlFor="grammar-personal-note">{t("vocabulary.notes")}</Label><Textarea className="mt-2 min-h-24" id="grammar-personal-note" maxLength={4000} onChange={(event) => setPersonalNote(event.target.value)} value={personalNote} /></div><div><Label>{t("vocabulary.mastery")}</Label><Select onValueChange={(value) => setMastery(value as VocabularyMastery)} value={mastery}><SelectTrigger className="mt-2 h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">{t("vocabulary.masteryNew")}</SelectItem><SelectItem value="learning">{t("vocabulary.masteryLearning")}</SelectItem><SelectItem value="mastered">{t("vocabulary.masteryMastered")}</SelectItem></SelectContent></Select></div>{error ? <p className="learning-inline-error" role="alert">{error}</p> : null}<div className="flex gap-2"><Button className="h-11 flex-1" onClick={() => onOpenChange(false)} type="button" variant="outline">{t("common.cancel")}</Button><Button className="h-11 flex-1" disabled={saving} type="submit">{saving ? t("common.saving") : t("common.save")}</Button></div></form></SheetContent></Sheet>
}
