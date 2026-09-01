import { Pencil, Sparkles, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { LEARNING_AI_ENABLED } from "@/constants/features"
import { useI18n } from "@/i18n/useI18n"
import type { GrammarItem } from "@/types/vocabulary"

interface Props {
  analyzing: boolean
  item: GrammarItem | null
  onAnalyze: (force: boolean) => void
  onDelete: () => void
  onEdit: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
}

function Field({ title, value }: { title: string; value: string | null | undefined }) {
  return value ? <section className="vocabulary-detail-section"><h3>{title}</h3><p>{value}</p></section> : null
}

function List({ title, values }: { title: string; values: readonly string[] }) {
  return values.length ? <section className="vocabulary-detail-section"><h3>{title}</h3><ul>{values.map((value) => <li key={value}>{value}</li>)}</ul></section> : null
}

export function GrammarItemDetailSheet({ analyzing, item, onAnalyze, onDelete, onEdit, onOpenChange, open }: Props) {
  const { t } = useI18n()
  if (!item) return null
  return <Sheet onOpenChange={onOpenChange} open={open}><SheetContent className="responsive-bottom-sheet vocabulary-detail-sheet max-h-[92dvh] rounded-t-[28px] md:max-w-md md:rounded-none" side={typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches ? "right" : "bottom"}><SheetHeader><p className="vocabulary-detail-kicker">GRAMMAR / LESSON {item.lessonNumber}</p><SheetTitle className="vocabulary-detail-term">{item.pattern}</SheetTitle><SheetDescription>{item.meaning || t("vocabulary.grammar")}</SheetDescription></SheetHeader><div className="vocabulary-detail-actions"><Button onClick={onEdit} variant="outline"><Pencil className="size-4" />{t("common.edit")}</Button>{LEARNING_AI_ENABLED ? <Button disabled={analyzing} onClick={() => onAnalyze(Boolean(item.analysis))} variant="outline"><Sparkles className="size-4" />{analyzing ? t("vocabulary.analyzing") : item.analysis ? t("vocabulary.reanalyze") : t("vocabulary.aiAnalyze")}</Button> : null}<Button aria-label={t("common.delete")} onClick={onDelete} size="icon" variant="ghost"><Trash2 /></Button></div><div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"><Field title={t("vocabulary.meaning")} value={item.meaning} /><Field title={t("vocabulary.grammarConnection")} value={item.connection} /><Field title={t("vocabulary.grammarUsage")} value={item.usageNote} /><Field title={t("vocabulary.grammarExample")} value={item.example} /><Field title={t("vocabulary.grammarExampleTranslation")} value={item.exampleTranslation} /><Field title={t("vocabulary.notes")} value={item.personalNote} />{item.analysis ? <div className="vocabulary-analysis"><p className="vocabulary-detail-kicker">{t("vocabulary.aiAssisted")}</p><Field title={t("vocabulary.meaning")} value={item.analysis.meaning} /><Field title={t("vocabulary.grammarConnection")} value={item.analysis.connection} /><List title={t("vocabulary.usageNotes")} values={item.analysis.usageNotes} /><List title={t("vocabulary.grammarMistakes")} values={item.analysis.commonMistakes} /><List title={t("vocabulary.grammarComparisons")} values={item.analysis.comparisons} />{item.analysis.examples.map((example) => <blockquote key={example.sentence}><strong>{example.sentence}</strong><span>{example.translation}</span></blockquote>)}<Field title={t("vocabulary.memoryTip")} value={item.analysis.memoryTip} /></div> : null}</div></SheetContent></Sheet>
}
