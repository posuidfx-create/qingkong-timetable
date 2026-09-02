import { useCallback, useEffect, useMemo, useState } from "react"
import { BookOpen, ChevronDown, ImagePlus, Search, Sparkles } from "lucide-react"

import { GrammarLessonPanel } from "@/components/learning/GrammarLessonPanel"
import { VocabularyWorkspace } from "@/components/learning/VocabularyWorkspace"
import { VocabularyImageImportSheet } from "@/components/learning/VocabularyImageImportSheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { LEARNING_AI_ENABLED } from "@/constants/features"
import { useI18n } from "@/i18n/useI18n"
import { fetchGrammarItems } from "@/lib/grammarService"
import { analyzeVocabularyLesson, fetchVocabularyLessonAnalyses } from "@/lib/japaneseLessonAnalysis"
import { BEGINNER_ONE_RANGE, BEGINNER_TWO_RANGE, buildLessonCounts, getJapaneseLessonVolume, getLessonsForVolume, isWordUnclassified, searchGrammarItems, wordBelongsToLesson } from "@/lib/japaneseLessons"
import type { LearningCourseOption } from "@/lib/learningLibrary"
import { fetchVocabularyWords } from "@/lib/vocabularyService"
import { searchVocabularyWords } from "@/lib/vocabulary"
import type { GrammarItem, VocabularyLessonAnalysis, VocabularyWord } from "@/types/vocabulary"

type RootFilter = "all" | "textbook" | "unclassified"
type LessonTab = "words" | "grammar" | "knowledge"

interface Props {
  courseOptions: readonly LearningCourseOption[]
  lessonNumber: number | null
  onBack: () => void
  onOpenLesson: (lessonNumber: number) => void
  onOpenRoot: () => void
}

function LessonIndexContent({ analyses, grammarItems, onOpenLesson, words }: { analyses: readonly VocabularyLessonAnalysis[]; grammarItems: readonly GrammarItem[]; onOpenLesson: (lesson: number) => void; words: readonly VocabularyWord[] }) {
  const { t } = useI18n()
  const counts = useMemo(() => buildLessonCounts(words, grammarItems, analyses), [analyses, grammarItems, words])
  const renderVolume = (volume: "beginner_1" | "beginner_2") => {
    const lessons = getLessonsForVolume(volume)
    const range = volume === "beginner_1" ? BEGINNER_ONE_RANGE : BEGINNER_TWO_RANGE
    return <section className="japanese-volume"><header><div><p>{t(volume === "beginner_1" ? "vocabulary.beginnerOne" : "vocabulary.beginnerTwo")}</p><span>{range.start}–{range.end}</span></div><small>{t("vocabulary.lessonRange", { start: range.start, end: range.end })}</small></header><div className="japanese-lesson-grid">{lessons.map((lesson) => { const count = counts[lesson - 1]; return <button key={lesson} onClick={() => onOpenLesson(lesson)} type="button"><strong>{String(lesson).padStart(2, "0")}</strong><span>{count?.words ?? 0} · {count?.grammar ?? 0}</span>{count?.analyzed ? <Sparkles aria-label={t("vocabulary.lessonAnalyzed")} className="size-3.5" /> : null}</button> })}</div></section>
  }
  const beginnerTwo = counts.slice(25)
  return <div className="japanese-textbook-index"><header className="japanese-textbook-hero"><div><p>MINNA NO NIHONGO</p><h1>{t("vocabulary.minnaNoNihongo")}</h1><span>{t("vocabulary.textbookDescription")}</span></div><dl><div><dt>{t("vocabulary.learnedLessons")}</dt><dd>{beginnerTwo.filter((item) => item.words + item.grammar > 0).length}</dd></div><div><dt>{t("vocabulary.totalWords")}</dt><dd>{beginnerTwo.reduce((sum, item) => sum + item.words, 0)}</dd></div><div><dt>{t("vocabulary.totalGrammar")}</dt><dd>{beginnerTwo.reduce((sum, item) => sum + item.grammar, 0)}</dd></div><div><dt>{t("vocabulary.analyzedLessons")}</dt><dd>{beginnerTwo.filter((item) => item.analyzed).length}</dd></div></dl></header>{renderVolume("beginner_2")}{renderVolume("beginner_1")}<section className="japanese-overview"><header><div><p>{t("vocabulary.beginnerTwo")}</p><h2>{t("vocabulary.aiOverview")}</h2></div><span>{t("vocabulary.aiOverviewDescription")}</span></header>{BEGINNER_TWO_RANGE && analyses.filter((item) => item.lessonNumber >= 26 && item.lessonNumber <= 50 && item.analysis).length ? <div>{analyses.filter((item) => item.lessonNumber >= 26 && item.lessonNumber <= 50 && item.analysis).map((item) => <article key={item.id}><strong>{String(item.lessonNumber).padStart(2, "0")}</strong><p>{item.analysis?.lessonSummary}</p></article>)}</div> : <p className="vocabulary-empty">{t("vocabulary.overviewEmpty")}</p>}</section></div>
}

function LessonIndex(props: { analyses: readonly VocabularyLessonAnalysis[]; grammarItems: readonly GrammarItem[]; onOpenLesson: (lesson: number) => void; words: readonly VocabularyWord[] }) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const matchedWords = useMemo(() => searchVocabularyWords(props.words, query).filter((word) => query.trim() && [word.term, word.reading, word.meaning, word.notes, word.analysis?.meanings.join(" ")].filter(Boolean).join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [props.words, query])
  const matchedGrammar = useMemo(() => query.trim() ? searchGrammarItems(props.grammarItems, query) : [], [props.grammarItems, query])
  return <><label className="japanese-lesson-search"><Search className="size-4" /><Input aria-label={t("vocabulary.search")} onChange={(event) => setQuery(event.target.value)} placeholder={t("vocabulary.searchPlaceholder")} value={query} /></label>{query.trim() ? <section className="japanese-search-results"><header><h2>{t("vocabulary.searchResults")}</h2><span>{matchedWords.length + matchedGrammar.length}</span></header>{matchedWords.map((word) => <button disabled={!word.lessonNumber} key={`word-${word.id}`} onClick={() => { if (word.lessonNumber) props.onOpenLesson(word.lessonNumber) }} type="button"><strong>{word.term}</strong><span>{word.lessonNumber ? `${t("vocabulary.lessonNumber", { lesson: word.lessonNumber })} · ${t("vocabulary.words")}` : t("vocabulary.unclassified")}</span></button>)}{matchedGrammar.map((item) => <button key={`grammar-${item.id}`} onClick={() => props.onOpenLesson(item.lessonNumber)} type="button"><strong>{item.pattern}</strong><span>{t("vocabulary.lessonNumber", { lesson: item.lessonNumber })} · {t("vocabulary.grammar")}</span></button>)}{!matchedWords.length && !matchedGrammar.length ? <p>{t("vocabulary.searchEmpty")}</p> : null}</section> : null}<LessonIndexContent {...props} /></>
}

function LessonKnowledge({ analysis, analyzing, lessonNumber, onAnalyze }: { analysis: VocabularyLessonAnalysis | null; analyzing: boolean; lessonNumber: number; onAnalyze: (force: boolean) => void }) {
  const { t } = useI18n()
  const data = analysis?.analysis
  const list = (title: string, values: readonly string[]) => values.length ? <section><h3>{title}</h3><ol>{values.map((value) => <li key={value}>{value}</li>)}</ol></section> : null
  return <section className="lesson-knowledge"><header><div><p>{t("vocabulary.lessonNumber", { lesson: lessonNumber })}</p><h2>{t("vocabulary.knowledge")}</h2></div>{LEARNING_AI_ENABLED ? <Button disabled={analyzing} onClick={() => onAnalyze(Boolean(data))}><Sparkles className="size-4" />{analyzing ? t("vocabulary.analyzing") : data ? t("vocabulary.reanalyzeLesson") : t("vocabulary.analyzeLesson")}</Button> : null}</header>{data ? <div className="lesson-knowledge-content"><section><h3>{t("vocabulary.lessonSummary")}</h3><p>{data.lessonSummary}</p></section>{list(t("vocabulary.keyVocabulary"), data.keyVocabulary)}{list(t("vocabulary.keyGrammar"), data.keyGrammar)}{list(t("vocabulary.commonConfusions"), data.commonConfusions)}{list(t("vocabulary.reviewChecklist"), data.reviewChecklist)}{list(t("vocabulary.suggestedPractice"), data.suggestedPractice)}</div> : <div className="vocabulary-empty"><BookOpen className="size-6" /><h2>{t("vocabulary.knowledgeEmpty")}</h2><p>{t(LEARNING_AI_ENABLED ? "vocabulary.knowledgeEmptyDescription" : "vocabulary.aiDisabled")}</p></div>}</section>
}

export function JapaneseLessonWorkspace({ courseOptions, lessonNumber, onBack, onOpenLesson, onOpenRoot }: Props) {
  const { t } = useI18n()
  const [words, setWords] = useState<VocabularyWord[]>([])
  const [grammarItems, setGrammarItems] = useState<GrammarItem[]>([])
  const [analyses, setAnalyses] = useState<VocabularyLessonAnalysis[]>([])
  const [rootFilter, setRootFilter] = useState<RootFilter>("textbook")
  const [lessonTab, setLessonTab] = useState<LessonTab>("words")
  const [pickerOpen, setPickerOpen] = useState(false)
  const [imageImportOpen, setImageImportOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([fetchVocabularyWords(), fetchGrammarItems(), fetchVocabularyLessonAnalyses()]).then(([nextWords, nextGrammar, nextAnalyses]) => {
      if (active) { setWords(nextWords); setGrammarItems(nextGrammar); setAnalyses(nextAnalyses) }
    }).catch(() => undefined)
    return () => { active = false }
  }, [])

  const lessonWordFilter = useCallback((word: VocabularyWord) => lessonNumber !== null && wordBelongsToLesson(word, lessonNumber), [lessonNumber])
  const unclassifiedFilter = useCallback((word: VocabularyWord) => isWordUnclassified(word), [])
  const currentAnalysis = lessonNumber === null ? null : analyses.find((item) => item.lessonNumber === lessonNumber) ?? null

  const analyzeLesson = async (force: boolean) => {
    if (lessonNumber === null || !LEARNING_AI_ENABLED) return
    setAnalyzing(true)
    try {
      const result = await analyzeVocabularyLesson(lessonNumber, force)
      setAnalyses((current) => [...current.filter((item) => item.lessonNumber !== lessonNumber), result.analysis])
    } finally { setAnalyzing(false) }
  }

  if (lessonNumber === null) return <section className="japanese-learning-workspace"><nav aria-label={t("vocabulary.libraryFilter")} className="japanese-root-tabs"><button data-active={rootFilter === "all"} onClick={() => setRootFilter("all")} type="button">{t("common.all")}</button><button data-active={rootFilter === "textbook"} onClick={() => setRootFilter("textbook")} type="button">{t("vocabulary.minnaNoNihongo")}</button><button data-active={rootFilter === "unclassified"} onClick={() => setRootFilter("unclassified")} type="button">{t("vocabulary.unclassified")}</button></nav>{rootFilter === "textbook" ? <LessonIndex analyses={analyses} grammarItems={grammarItems} onOpenLesson={onOpenLesson} words={words} /> : <VocabularyWorkspace courseOptions={courseOptions} onBack={onBack} wordFilter={rootFilter === "unclassified" ? unclassifiedFilter : undefined} />}</section>

  const volume = getJapaneseLessonVolume(lessonNumber)
  const counts = buildLessonCounts(words, grammarItems, analyses)[lessonNumber - 1]
  return <section className="japanese-lesson-detail"><header className="lesson-detail-header"><button onClick={onOpenRoot} type="button">{t("vocabulary.minnaNoNihongo")}</button><div><p>LESSON {String(lessonNumber).padStart(2, "0")}</p><h1>{t("vocabulary.lessonNumber", { lesson: lessonNumber })}</h1><span>{t(volume === "beginner_1" ? "vocabulary.beginnerOne" : "vocabulary.beginnerTwo")}</span></div><div className="lesson-detail-actions"><Button className="lesson-picker-trigger" onClick={() => setPickerOpen(true)} variant="outline"><span>{t("vocabulary.changeLesson")}</span><ChevronDown className="size-4" /></Button>{LEARNING_AI_ENABLED ? <Button onClick={() => setImageImportOpen(true)} variant="outline"><ImagePlus className="size-4" />{t("vocabulary.imageImport")}</Button> : null}</div><dl><div><dt>{t("vocabulary.words")}</dt><dd>{counts?.words ?? 0}</dd></div><div><dt>{t("vocabulary.grammar")}</dt><dd>{counts?.grammar ?? 0}</dd></div><div><dt>{t("vocabulary.notes")}</dt><dd>{(counts?.words ?? 0) + (counts?.grammar ?? 0)}</dd></div></dl></header><nav aria-label={t("vocabulary.lessonNavigation")} className="lesson-detail-tabs"><button data-active={lessonTab === "words"} onClick={() => setLessonTab("words")} type="button">{t("vocabulary.words")}</button><button data-active={lessonTab === "grammar"} onClick={() => setLessonTab("grammar")} type="button">{t("vocabulary.grammar")}</button><button data-active={lessonTab === "knowledge"} onClick={() => setLessonTab("knowledge")} type="button">{t("vocabulary.knowledge")}</button></nav>{lessonTab === "words" ? <VocabularyWorkspace courseOptions={courseOptions} initialLessonNumber={lessonNumber} onBack={onOpenRoot} wordFilter={lessonWordFilter} /> : lessonTab === "grammar" ? <GrammarLessonPanel lessonNumber={lessonNumber} /> : <LessonKnowledge analysis={currentAnalysis} analyzing={analyzing} lessonNumber={lessonNumber} onAnalyze={(force) => void analyzeLesson(force)} />}<VocabularyImageImportSheet lessonNumber={lessonNumber} onImported={(created) => setWords((current) => [...created, ...current])} onOpenChange={setImageImportOpen} open={imageImportOpen} words={words} /><Sheet onOpenChange={setPickerOpen} open={pickerOpen}><SheetContent className="responsive-bottom-sheet max-h-[88dvh] rounded-t-[28px]" side="bottom"><SheetHeader><SheetTitle>{t("vocabulary.changeLesson")}</SheetTitle><SheetDescription>{t(volume === "beginner_1" ? "vocabulary.beginnerOne" : "vocabulary.beginnerTwo")}</SheetDescription></SheetHeader><div className="lesson-picker-grid">{getLessonsForVolume(volume).map((lesson) => <button aria-current={lesson === lessonNumber ? "page" : undefined} data-active={lesson === lessonNumber} key={lesson} onClick={() => { onOpenLesson(lesson); setPickerOpen(false) }} type="button"><strong>{String(lesson).padStart(2, "0")}</strong><span>{buildLessonCounts(words, grammarItems, analyses)[lesson - 1]?.words ?? 0} · {buildLessonCounts(words, grammarItems, analyses)[lesson - 1]?.grammar ?? 0}</span></button>)}</div></SheetContent></Sheet></section>
}
