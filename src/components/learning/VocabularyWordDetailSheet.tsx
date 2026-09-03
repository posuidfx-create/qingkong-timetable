import { useEffect, useState } from "react"
import { Pencil, Sparkles, Square, Trash2, Volume2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { LEARNING_AI_ENABLED } from "@/constants/features"
import { useI18n } from "@/i18n/useI18n"
import type { VocabularyAnalysis, VocabularyWord } from "@/types/vocabulary"

interface VocabularyWordDetailSheetProps {
  active: boolean
  analyzing: boolean
  onAnalyze: (force: boolean) => void
  onDelete: () => void
  onEdit: () => void
  onOpenChange: (open: boolean) => void
  onPlay: () => void
  onStop: () => void
  open: boolean
  word: VocabularyWord | null
}
function useDesktopSheet(): boolean {
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches)
  useEffect(() => { const query = window.matchMedia("(min-width: 768px)"); const update = () => setDesktop(query.matches); update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update) }, [])
  return desktop
}

function AnalysisList({ title, values }: { title: string; values: readonly string[] }) {
  if (!values.length) return null
  return <section className="vocabulary-detail-section"><h3>{title}</h3><ul>{values.map((value) => <li key={value}>{value}</li>)}</ul></section>
}

function VocabularyAnalysisView({ analysis }: { analysis: VocabularyAnalysis }) {
  const { t } = useI18n()
  return <div className="vocabulary-analysis"><p className="vocabulary-detail-kicker">{t("vocabulary.aiAssisted")}</p>{analysis.reading || analysis.pronunciation ? <section className="vocabulary-detail-section"><h3>{t("vocabulary.pronunciation")}</h3><p>{[analysis.reading, analysis.pronunciation].filter(Boolean).join(" · ")}</p></section> : null}<AnalysisList title={t("vocabulary.partsOfSpeech")} values={analysis.partsOfSpeech} /><AnalysisList title={t("vocabulary.meanings")} values={analysis.meanings} /><AnalysisList title={t("vocabulary.usageNotes")} values={analysis.usageNotes} /><AnalysisList title={t("vocabulary.collocations")} values={analysis.collocations} /><AnalysisList title={t("vocabulary.forms")} values={analysis.forms} /><AnalysisList title={t("vocabulary.confusions")} values={analysis.confusions} />{analysis.examples.length ? <section className="vocabulary-detail-section"><h3>{t("vocabulary.examples")}</h3>{analysis.examples.map((example) => <blockquote key={`${example.text}-${example.translation}`}><strong>{example.text}</strong>{example.translation ? <span>{example.translation}</span> : null}</blockquote>)}</section> : null}{analysis.memoryTip ? <section className="vocabulary-detail-section"><h3>{t("vocabulary.memoryTip")}</h3><p>{analysis.memoryTip}</p></section> : null}<AnalysisList title={t("vocabulary.warnings")} values={analysis.warnings} /></div>
}

export function VocabularyWordDetailSheet(props: VocabularyWordDetailSheetProps) {
  const { t } = useI18n(); const desktop = useDesktopSheet(); const word = props.word
  if (!word) return null
  return <Sheet onOpenChange={props.onOpenChange} open={props.open}><SheetContent className={desktop ? "vocabulary-detail-sheet w-full sm:max-w-md" : "responsive-bottom-sheet vocabulary-detail-sheet max-h-[92dvh] rounded-t-[28px]"} side={desktop ? "right" : "bottom"}><SheetHeader><p className="vocabulary-detail-kicker">WORD / {word.language}</p><SheetTitle className="vocabulary-detail-term">{word.term}</SheetTitle><SheetDescription>{word.reading || word.meaning || t("vocabulary.personalDictionary")}</SheetDescription></SheetHeader><div className="vocabulary-detail-actions"><Button aria-label={t(props.active ? "vocabulary.stopTerm" : "vocabulary.playTerm", { term: word.term })} onClick={props.active ? props.onStop : props.onPlay} size="icon" variant="outline">{props.active ? <Square /> : <Volume2 />}</Button><Button onClick={props.onEdit} variant="outline"><Pencil className="size-4" />{t("common.edit")}</Button>{LEARNING_AI_ENABLED ? <Button disabled={props.analyzing} onClick={() => props.onAnalyze(Boolean(word.analysis))} variant="outline"><Sparkles className="size-4" />{props.analyzing ? t("vocabulary.analyzing") : word.analysis ? t("vocabulary.reanalyze") : t("vocabulary.aiAnalyze")}</Button> : null}<Button aria-label={t("common.delete")} onClick={props.onDelete} size="icon" variant="ghost"><Trash2 /></Button></div><div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"><p className="vocabulary-detail-kicker">{t("vocabulary.personalDictionary")}</p>{word.reading ? <section className="vocabulary-detail-section"><h3>{t("vocabulary.reading")}</h3><p>{word.reading}</p></section> : null}{word.meaning ? <section className="vocabulary-detail-section"><h3>{t("vocabulary.meaning")}</h3><p>{word.meaning}</p></section> : null}{word.courseName ? <section className="vocabulary-detail-section"><h3>{t("vocabulary.course")}</h3><p>{word.courseName}</p></section> : null}{word.notes ? <section className="vocabulary-detail-section"><h3>{t("vocabulary.notes")}</h3><p>{word.notes}</p></section> : null}<section className="vocabulary-detail-section"><h3>{t("vocabulary.mastery")}</h3><p>{t(`vocabulary.mastery${word.mastery === "new" ? "New" : word.mastery === "learning" ? "Learning" : "Mastered"}` as "vocabulary.masteryNew")}</p></section>{word.analysis ? <VocabularyAnalysisView analysis={word.analysis} /> : <div className="vocabulary-analysis-empty"><Sparkles className="size-5" /><p>{t(LEARNING_AI_ENABLED ? "vocabulary.aiEmpty" : "vocabulary.aiDisabled")}</p></div>}</div></SheetContent></Sheet>
}
