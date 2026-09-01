import { useEffect, useState } from "react"
import { ArrowRight, Plus, Sparkles } from "lucide-react"

import { GrammarItemDetailSheet } from "@/components/learning/GrammarItemDetailSheet"
import { GrammarItemFormSheet } from "@/components/learning/GrammarItemFormSheet"
import { Button } from "@/components/ui/button"
import { LEARNING_AI_ENABLED } from "@/constants/features"
import { useI18n } from "@/i18n/useI18n"
import { createGrammarItem, deleteGrammarItem, fetchGrammarItems, updateGrammarItem } from "@/lib/grammarService"
import { analyzeGrammarItem } from "@/lib/japaneseLessonAnalysis"
import type { GrammarItem, GrammarItemDraft } from "@/types/vocabulary"

interface Props {
  lessonNumber: number
  onItemsChange?: (items: GrammarItem[]) => void
}

export function GrammarLessonPanel({ lessonNumber, onItemsChange }: Props) {
  const { t } = useI18n()
  const [items, setItems] = useState<GrammarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<GrammarItem | null>(null)
  const [detail, setDetail] = useState<GrammarItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void fetchGrammarItems().then((all) => {
      if (!active) return
      const lessonItems = all.filter((item) => item.lessonNumber === lessonNumber)
      setItems(lessonItems); onItemsChange?.(lessonItems); setError(null)
    }).catch(() => { if (active) setError(t("vocabulary.grammarLoadFailed")) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [lessonNumber, onItemsChange, t])

  const save = async (draft: GrammarItemDraft) => {
    const saved = editing ? await updateGrammarItem(editing, draft) : await createGrammarItem(draft)
    setItems((current) => {
      const next = editing ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]
      onItemsChange?.(next)
      return next
    })
    setDetail((current) => current?.id === saved.id ? saved : current)
    setEditing(null)
  }

  const remove = async (item: GrammarItem) => {
    try {
      await deleteGrammarItem(item)
      setItems((current) => {
        const next = current.filter((candidate) => candidate.id !== item.id)
        onItemsChange?.(next)
        return next
      })
      setDetail(null)
    } catch { setError(t("vocabulary.grammarDeleteFailed")) }
  }

  const analyze = async (item: GrammarItem, force: boolean) => {
    if (!LEARNING_AI_ENABLED) return
    setAnalyzingId(item.id); setError(null)
    try {
      const result = await analyzeGrammarItem(item.id, force)
      setItems((current) => current.map((candidate) => candidate.id === result.item.id ? result.item : candidate))
      setDetail(result.item)
    } catch { setError(t("vocabulary.analysisFailed")) }
    finally { setAnalyzingId(null) }
  }

  if (loading) return <p className="vocabulary-empty">{t("vocabulary.grammarLoading")}</p>
  return <section className="grammar-lesson-panel"><div className="grammar-panel-actions"><div><p>{t("vocabulary.grammar")}</p><strong>{items.length}</strong></div><Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="size-4" />{t("vocabulary.addGrammar")}</Button></div>{error ? <p className="learning-inline-error" role="alert">{error}</p> : null}{items.length ? <div className="grammar-list" role="list">{items.map((item, index) => <article className="grammar-row" key={item.id} role="listitem"><span>{String(index + 1).padStart(2, "0")}</span><button onClick={() => setDetail(item)} type="button"><strong>{item.pattern}</strong><small>{item.meaning || t("vocabulary.noMeaning")}</small></button><span>{t(`vocabulary.mastery${item.mastery === "new" ? "New" : item.mastery === "learning" ? "Learning" : "Mastered"}` as "vocabulary.masteryNew")}</span>{item.analysis ? <Sparkles aria-label={t("vocabulary.aiAssisted")} className="size-4" /> : null}<button aria-label={t("vocabulary.viewGrammarDetail")} onClick={() => setDetail(item)} type="button"><ArrowRight className="size-4" /></button></article>)}</div> : <div className="vocabulary-empty"><h2>{t("vocabulary.grammarEmpty")}</h2><p>{t("vocabulary.grammarEmptyDescription")}</p><Button onClick={() => setFormOpen(true)}><Plus className="size-4" />{t("vocabulary.addGrammar")}</Button></div>}<GrammarItemFormSheet item={editing} lessonNumber={lessonNumber} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null) }} onSave={save} open={formOpen} /><GrammarItemDetailSheet analyzing={detail?.id === analyzingId} item={detail} onAnalyze={(force) => { if (detail) void analyze(detail, force) }} onDelete={() => { if (detail) void remove(detail) }} onEdit={() => { if (detail) { setEditing(detail); setFormOpen(true) } }} onOpenChange={(open) => { if (!open) setDetail(null) }} open={Boolean(detail)} /></section>
}
