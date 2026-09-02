import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookMarked, CheckSquare2, ListChecks, Plus, Search, Sparkles, Square, Trash2, Volume2, X } from "lucide-react"

import { VocabularyWordDetailSheet } from "@/components/learning/VocabularyWordDetailSheet"
import { VocabularyWordFormSheet } from "@/components/learning/VocabularyWordFormSheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LEARNING_AI_ENABLED } from "@/constants/features"
import { useI18n } from "@/i18n/useI18n"
import type { LearningCourseOption } from "@/lib/learningLibrary"
import { playVocabularyWord, stopVocabularySpeech } from "@/lib/speechManager"
import { analyzeVocabularyWord, VocabularyAnalysisError } from "@/lib/vocabularyAnalysis"
import { selectAllVisibleVocabularyWords, toggleVocabularySelection } from "@/lib/vocabularyBulkDelete"
import { detectVocabularyLanguage, hasDuplicateVocabularyWord, searchVocabularyWords, sortVocabularyWords, type VocabularySort } from "@/lib/vocabulary"
import { createVocabularyWord, deleteVocabularyWord, deleteVocabularyWords, fetchVocabularyWords, getVocabularyServiceErrorMessage, updateVocabularyWord } from "@/lib/vocabularyService"
import type { VocabularyWord, VocabularyWordDraft } from "@/types/vocabulary"

interface VocabularyWorkspaceProps {
  courseOptions: readonly LearningCourseOption[]
  initialLessonNumber?: number | null
  onBack: () => void
  onWordsDeleted?: (ids: readonly string[]) => void
  wordFilter?: (word: VocabularyWord) => boolean
}

function messageForAnalysisError(t: ReturnType<typeof useI18n>["t"], error: unknown): string {
  if (error instanceof VocabularyAnalysisError) {
    if (error.code === "deepseek_not_configured" || error.code === "not_configured") return t("vocabulary.aiDisabled")
    if (error.code === "deepseek_quota") return t("learning.aiQuota")
    if (error.code === "deepseek_timeout") return t("learning.aiTimeout")
    if (error.code === "auth_required") return t("learning.aiAuthRequired")
  }
  return t("vocabulary.analysisFailed")
}

export function VocabularyWorkspace({ courseOptions, initialLessonNumber = null, onBack, onWordsDeleted, wordFilter }: VocabularyWorkspaceProps) {
  const { locale, t } = useI18n()
  const [allWords, setWords] = useState<VocabularyWord[]>([])
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<VocabularySort>("recent")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formTerm, setFormTerm] = useState("")
  const [editing, setEditing] = useState<VocabularyWord | null>(null)
  const [detail, setDetail] = useState<VocabularyWord | null>(null)
  const [deleting, setDeleting] = useState<VocabularyWord | null>(null)
  const [activeWordId, setActiveWordId] = useState<string | null>(null)
  const [focusedWord, setFocusedWord] = useState<VocabularyWord | null>(null)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [retryingFailed, setRetryingFailed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setWords(await fetchVocabularyWords())
      setError(null)
    } catch {
      setError(t("vocabulary.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    let active = true
    void fetchVocabularyWords()
      .then((items) => {
        if (active) {
          setWords(items)
          setError(null)
        }
      })
      .catch(() => {
        if (active) setError(t("vocabulary.loadFailed"))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      stopVocabularySpeech()
    }
  }, [t])

  const words = useMemo(() => wordFilter ? allWords.filter(wordFilter) : allWords, [allWords, wordFilter])
  const visibleWords = useMemo(() => sortVocabularyWords(searchVocabularyWords(words, query), sort, locale), [locale, query, sort, words])
  const exactMatch = useMemo(() => words.find((word) => word.term.trim().toLocaleLowerCase() === query.trim().toLocaleLowerCase()) ?? null, [query, words])

  const stop = useCallback(() => {
    stopVocabularySpeech()
    setActiveWordId(null)
  }, [])

  const play = useCallback((word: VocabularyWord) => {
    if (activeWordId === word.id) {
      stop()
      return
    }
    setError(null)
    const supported = playVocabularyWord(word, {
      onStart: () => setActiveWordId(word.id),
      onEnd: () => setActiveWordId(null),
      onError: () => {
        setActiveWordId(null)
        setError(t("vocabulary.speechUnavailable"))
      },
    })
    if (!supported) setError(t("vocabulary.speechUnavailable"))
  }, [activeWordId, stop, t])

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) return
      if (event.key === "Escape" && bulkConfirmOpen) return
      if (event.key === "Escape" && selectionMode) {
        setSelectionMode(false)
        setSelectedIds(new Set())
        setRetryingFailed(false)
        return
      }
      if (event.key === "Escape" && detail) {
        setDetail(null)
        return
      }
      if (!focusedWord) return
      if (event.key === "Enter") {
        event.preventDefault()
        setDetail(focusedWord)
      }
      if (event.key === " ") {
        event.preventDefault()
        play(focusedWord)
      }
    }
    window.addEventListener("keydown", keydown)
    return () => window.removeEventListener("keydown", keydown)
  }, [bulkConfirmOpen, detail, focusedWord, play, selectionMode])

  const openNew = (term = "") => {
    setEditing(null)
    setFormTerm(term)
    setFormOpen(true)
  }
  const openEdit = (word: VocabularyWord) => {
    setEditing(word)
    setFormTerm("")
    setFormOpen(true)
  }

  const save = async (draft: VocabularyWordDraft) => {
    if (hasDuplicateVocabularyWord(words, draft.term, draft.language, editing?.id)) throw new Error("duplicate")
    try {
      const saved = editing ? await updateVocabularyWord(editing, draft) : await createVocabularyWord(draft)
      setWords((items) => editing ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items])
      setDetail((current) => current?.id === saved.id ? saved : current)
      setNotice(t(editing ? "vocabulary.updated" : "vocabulary.added"))
      setEditing(null)
    } catch (reason) {
      const code = getVocabularyServiceErrorMessage(reason)
      throw new Error(code === "duplicate" ? "duplicate" : "save_failed", { cause: reason })
    }
  }

  const runAnalysis = async (word: VocabularyWord, force = false) => {
    if (!LEARNING_AI_ENABLED) return
    setAnalyzingId(word.id)
    setError(null)
    setWords((items) => items.map((item) => item.id === word.id ? { ...item, analysisStatus: "processing" } : item))
    try {
      const result = await analyzeVocabularyWord(word.id, force)
      setWords((items) => items.map((item) => item.id === result.word.id ? result.word : item))
      setDetail((current) => current?.id === result.word.id ? result.word : current)
      setNotice(t(result.cached ? "vocabulary.analysisCached" : "vocabulary.analysisCompleted"))
    } catch (reason) {
      await load()
      setError(messageForAnalysisError(t, reason))
    } finally {
      setAnalyzingId(null)
    }
  }

  const analyzeQuery = async () => {
    if (!query.trim()) return
    if (exactMatch) {
      setDetail(exactMatch)
      await runAnalysis(exactMatch, false)
      return
    }
    try {
      const word = await createVocabularyWord({
        term: query.trim(), language: detectVocabularyLanguage(query), reading: "", meaning: "", notes: "", courseName: "", courseKey: "",
        textbookKey: initialLessonNumber ? "minna_no_nihongo" : "", volume: initialLessonNumber ? (initialLessonNumber <= 25 ? "beginner_1" : "beginner_2") : "",
        lessonNumber: initialLessonNumber, mastery: "new",
      })
      setWords((items) => [word, ...items])
      setDetail(word)
      setNotice(t("vocabulary.addedForAnalysis"))
      await runAnalysis(word, false)
    } catch (reason) {
      setError(t(getVocabularyServiceErrorMessage(reason) === "duplicate" ? "vocabulary.duplicate" : "vocabulary.saveFailed"))
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await deleteVocabularyWord(deleting)
      setWords((items) => items.filter((item) => item.id !== deleting.id))
      setDetail((current) => current?.id === deleting.id ? null : current)
      onWordsDeleted?.([deleting.id])
      setDeleting(null)
      setNotice(t("vocabulary.deleted"))
    } catch {
      setError(t("vocabulary.deleteFailed"))
    }
  }

  const enterSelectionMode = () => {
    stop()
    setSelectionMode(true)
    setSelectedIds(new Set())
    setRetryingFailed(false)
    setDetail(null)
  }
  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedIds(new Set())
    setRetryingFailed(false)
    setBulkConfirmOpen(false)
  }
  const selectVisible = () => {
    setSelectedIds(selectAllVisibleVocabularyWords(visibleWords.map((word) => word.id)))
    setRetryingFailed(false)
  }
  const clearSelection = () => {
    setSelectedIds(new Set())
    setRetryingFailed(false)
  }

  const confirmBulkDelete = async () => {
    if (!selectedIds.size) return
    setBulkDeleting(true)
    setError(null)
    try {
      const result = await deleteVocabularyWords([...selectedIds])
      if (result.deletedIds.length) {
        const deleted = new Set(result.deletedIds)
        setWords((items) => items.filter((item) => !deleted.has(item.id)))
        setDetail((current) => current && deleted.has(current.id) ? null : current)
        onWordsDeleted?.(result.deletedIds)
      }
      setSelectedIds(new Set(result.failedIds))
      setBulkConfirmOpen(false)
      if (result.failedIds.length) {
        setRetryingFailed(true)
        setNotice(t("vocabulary.bulkDeletePartial", { deleted: result.deletedIds.length, failed: result.failedIds.length }))
      } else {
        setNotice(t("vocabulary.bulkDeleted", { count: result.deletedIds.length }))
        setSelectionMode(false)
        setRetryingFailed(false)
      }
    } catch {
      setError(t("vocabulary.deleteFailed"))
    } finally {
      setBulkDeleting(false)
    }
  }

  return (
    <section className="vocabulary-workspace" data-selection={selectionMode || undefined}>
      <header className="vocabulary-workspace-header">
        <button className="vocabulary-back" onClick={onBack} type="button"><ArrowLeft className="size-4" />{t("learning.courseArchive")}</button>
        <div><p>VOCABULARY / PERSONAL DICTIONARY</p><h1>{t("vocabulary.title")}</h1><span>{t("vocabulary.description")}</span></div>
        <div className="vocabulary-header-actions">
          {selectionMode ? (
            <Button aria-label={t("common.done")} onClick={exitSelectionMode} variant="outline"><X className="size-4" />{t("common.done")}</Button>
          ) : (
            <><Button onClick={enterSelectionMode} variant="outline"><ListChecks className="size-4" />{t("vocabulary.select")}</Button><Button onClick={() => openNew()}><Plus className="size-4" />{t("vocabulary.addWord")}</Button></>
          )}
        </div>
      </header>

      <div className="vocabulary-toolbar">
        <label><span className="sr-only">{t("vocabulary.search")}</span><Search className="size-4" /><Input aria-label={t("vocabulary.search")} onChange={(event) => { setQuery(event.target.value); if (selectionMode) clearSelection() }} placeholder={t("vocabulary.searchPlaceholder")} value={query} /></label>
        <Select onValueChange={(value) => setSort(value as VocabularySort)} value={sort}><SelectTrigger aria-label={t("vocabulary.sort")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recent">{t("vocabulary.sortRecent")}</SelectItem><SelectItem value="alphabetical">{t("vocabulary.sortAlphabetical")}</SelectItem><SelectItem value="mastery">{t("vocabulary.sortMastery")}</SelectItem></SelectContent></Select>
      </div>

      {selectionMode ? (
        <div className="vocabulary-selection-summary" role="status">
          <strong>{t("vocabulary.selectedCount", { count: selectedIds.size })}</strong>
          <div><Button disabled={!visibleWords.length} onClick={selectVisible} size="sm" variant="ghost"><CheckSquare2 className="size-4" />{t("vocabulary.selectAllVisible")}</Button><Button disabled={!selectedIds.size} onClick={clearSelection} size="sm" variant="ghost">{t("vocabulary.clearSelection")}</Button></div>
        </div>
      ) : null}

      {notice ? <p className="learning-inline-notice" role="status">{notice}</p> : null}
      {error ? <div className="learning-inline-error" role="alert"><span>{error}</span><Button onClick={() => setError(null)} size="sm" variant="outline">{t("common.close")}</Button></div> : null}

      <div className="vocabulary-metrics">
        <span><strong>{words.length}</strong>{t("vocabulary.wordsCount")}</span>
        <span><strong>{words.filter((word) => word.mastery === "mastered").length}</strong>{t("vocabulary.masteredCount")}</span>
        <span><strong>{words.filter((word) => word.analysisStatus === "completed").length}</strong>{t("vocabulary.analyzedCount")}</span>
      </div>

      {loading ? <p className="vocabulary-empty">{t("vocabulary.loading")}</p> : visibleWords.length ? (
        <div aria-label={t("vocabulary.wordList")} className="vocabulary-list" role="list">
          {visibleWords.map((word, index) => {
            const selected = selectedIds.has(word.id)
            return (
              <article className="vocabulary-row" data-selected={selected || undefined} data-selection={selectionMode || undefined} key={word.id} onFocus={() => setFocusedWord(word)} onMouseEnter={() => setFocusedWord(word)} role="listitem">
                {selectionMode ? <label className="vocabulary-select-word"><input aria-label={t("vocabulary.selectWord", { term: word.term })} checked={selected} onChange={() => setSelectedIds((current) => toggleVocabularySelection(current, word.id))} type="checkbox" /><span aria-hidden="true" /></label> : null}
                <span className="vocabulary-row-index">{String(index + 1).padStart(3, "0")}</span>
                <button aria-label={`${t("vocabulary.play")} ${word.term}`} className="vocabulary-row-word" disabled={selectionMode} onClick={() => play(word)} type="button"><strong>{word.term}</strong>{word.reading ? <small>{word.reading}</small> : null}</button>
                <span className="vocabulary-row-meaning">{word.meaning || word.analysis?.meanings[0] || t("vocabulary.noMeaning")}</span>
                <span className="vocabulary-row-mastery">{t(`vocabulary.mastery${word.mastery === "new" ? "New" : word.mastery === "learning" ? "Learning" : "Mastered"}` as "vocabulary.masteryNew")}</span>
                <button aria-label={t(activeWordId === word.id ? "vocabulary.stop" : "vocabulary.play")} className="vocabulary-speaker" disabled={selectionMode} onClick={() => play(word)} type="button">{activeWordId === word.id ? <><span aria-hidden="true" className="vocabulary-equalizer"><i /><i /><i /></span><Square className="size-4" /></> : <Volume2 className="size-5" />}</button>
                <button aria-label={`${t("vocabulary.viewDetail")} ${word.term}`} className="vocabulary-detail-open" disabled={selectionMode} onClick={() => setDetail(word)} type="button"><ArrowRight className="size-4" /></button>
              </article>
            )
          })}
        </div>
      ) : query.trim() ? (
        <section className="vocabulary-not-collected"><BookMarked className="size-6" /><p>{t("vocabulary.notCollected")}</p><h2>{query.trim()}</h2><div><Button onClick={() => play({ id: "query", userId: "", term: query.trim(), language: detectVocabularyLanguage(query), reading: null, meaning: null, notes: null, courseName: null, courseKey: null, mastery: "new", analysisStatus: "uploaded", analysis: null, createdAt: "", updatedAt: "" })} variant="outline"><Volume2 className="size-4" />{t("vocabulary.play")}</Button>{LEARNING_AI_ENABLED ? <Button onClick={() => void analyzeQuery()}><Sparkles className="size-4" />{t("vocabulary.aiAnalyze")}</Button> : null}<Button onClick={() => openNew(query.trim())} variant="outline"><Plus className="size-4" />{t("vocabulary.addToWordbook")}</Button></div></section>
      ) : (
        <section className="vocabulary-empty"><BookMarked className="size-6" /><h2>{t("vocabulary.empty")}</h2><p>{t("vocabulary.emptyDescription")}</p><Button onClick={() => openNew()}><Plus className="size-4" />{t("vocabulary.addFirst")}</Button></section>
      )}

      {selectionMode ? (
        <div className="vocabulary-selection-bar" role="toolbar">
          <span>{t("vocabulary.selectedCount", { count: selectedIds.size })}</span>
          <div><Button disabled={!selectedIds.size || bulkDeleting} onClick={clearSelection} variant="ghost">{t("vocabulary.clearSelection")}</Button><Button aria-label={retryingFailed ? t("vocabulary.retryFailed") : t("vocabulary.deleteSelected")} disabled={!selectedIds.size || bulkDeleting} onClick={() => setBulkConfirmOpen(true)} variant="destructive"><Trash2 className="size-4" />{retryingFailed ? t("vocabulary.retryFailed") : t("common.delete")}</Button></div>
        </div>
      ) : null}

      <VocabularyWordFormSheet courseOptions={courseOptions} initialTerm={formTerm} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null) }} onSave={save} open={formOpen} word={editing} />
      <VocabularyWordDetailSheet active={detail?.id === activeWordId} analyzing={detail?.id === analyzingId} onAnalyze={(force) => { if (detail) void runAnalysis(detail, force) }} onDelete={() => { if (detail) setDeleting(detail) }} onEdit={() => { if (detail) openEdit(detail) }} onOpenChange={(open) => { if (!open) setDetail(null) }} onPlay={() => { if (detail) play(detail) }} onStop={stop} open={Boolean(detail)} word={detail} />

      <AlertDialog onOpenChange={(open) => { if (!open) setDeleting(null) }} open={Boolean(deleting)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("vocabulary.deleteTitle")}</AlertDialogTitle><AlertDialogDescription>{t("vocabulary.deleteDescription")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => void confirmDelete()} variant="destructive">{t("common.delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog onOpenChange={setBulkConfirmOpen} open={bulkConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("vocabulary.bulkDeleteTitle", { count: selectedIds.size })}</AlertDialogTitle><AlertDialogDescription>{t("vocabulary.bulkDeleteDescription")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={bulkDeleting}>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction disabled={!selectedIds.size || bulkDeleting} onClick={(event) => { event.preventDefault(); void confirmBulkDelete() }} variant="destructive">{t("vocabulary.bulkDeleteAction", { count: selectedIds.size })}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </section>
  )
}
