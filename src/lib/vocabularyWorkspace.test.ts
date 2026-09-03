import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const workspace = readFileSync(new URL("../components/learning/VocabularyWorkspace.tsx", import.meta.url), "utf8")
const detail = readFileSync(new URL("../components/learning/VocabularyWordDetailSheet.tsx", import.meta.url), "utf8")
const styles = readFileSync(new URL("../index.css", import.meta.url), "utf8")
const service = readFileSync(new URL("vocabularyService.ts", import.meta.url), "utf8")
const lessonWorkspace = readFileSync(new URL("../components/learning/JapaneseLessonWorkspace.tsx", import.meta.url), "utf8")

describe("Vocabulary Workspace interaction contract", () => {
  it("makes every word independently playable and detail-accessible", () => {
    expect(workspace).toContain("vocabulary-row-word")
    expect(workspace).toContain("vocabulary-speaker")
    expect(workspace).toContain("setDetail(word)")
    expect(workspace).toContain("play(word)")
    expect(workspace).toContain('t("vocabulary.playTerm", { term: word.term })')
    expect(detail).toContain('t(props.active ? "vocabulary.stopTerm" : "vocabulary.playTerm", { term: word.term })')
    expect(workspace).not.toMatch(/textContent|innerText|formattedText|displayText/)
  })

  it("routes list, lesson, search and detail playback through the same term-only manager", () => {
    expect(workspace.match(/onClick=\{\(\) => play\(word\)\}/g)).toHaveLength(2)
    expect(workspace).toContain('term: query.trim()')
    expect(workspace).toContain('onPlay={() => { if (detail) play(detail) }}')
    expect(lessonWorkspace).toContain("<VocabularyWorkspace")
  })

  it("supports search, duplicate prevention and explicit AI analysis", () => {
    expect(workspace).toContain("searchVocabularyWords")
    expect(workspace).toContain("hasDuplicateVocabularyWord")
    expect(workspace).toContain("analyzeVocabularyWord")
    expect(workspace).toContain("LEARNING_AI_ENABLED")
  })

  it("uses a mobile bottom sheet and desktop inspector", () => {
    expect(detail).toContain('desktop ? "right" : "bottom"')
    expect(detail).toContain("responsive-bottom-sheet")
    expect(styles).toContain("@media (max-width: 374px)")
    expect(styles).toContain("grid-template-columns:minmax(4.75rem,.9fr)")
    expect(styles).toContain("2.75rem 2.75rem")
    expect(styles).toContain("calc(6.75rem + env(safe-area-inset-bottom))")
    expect(detail).toContain("max-h-[92dvh]")
    expect(detail).toContain("overflow-y-auto")
  })

  it("supports Enter, Space and Escape without intercepting form inputs", () => {
    expect(workspace).toContain('event.key === "Enter"')
    expect(workspace).toContain('event.key === " "')
    expect(workspace).toContain('event.key === "Escape"')
    expect(workspace).toContain("target instanceof HTMLInputElement")
  })

  it("supports explicit selection mode and a destructive confirmation", () => {
    expect(workspace).toContain("enterSelectionMode")
    expect(workspace).toContain("toggleVocabularySelection")
    expect(workspace).toContain("selectAllVisibleVocabularyWords(visibleWords.map")
    expect(workspace).toContain("bulkDeleteDescription")
    expect(workspace).toContain("setBulkConfirmOpen(true)")
    expect(workspace).toContain("confirmBulkDelete")
  })

  it("keeps failed ids selected while removing successful ids immediately", () => {
    expect(workspace).toContain("setSelectedIds(new Set(result.failedIds))")
    expect(workspace).toContain("items.filter((item) => !deleted.has(item.id))")
    expect(workspace).toContain("retryFailed")
    expect(workspace).toContain("onWordsDeleted?.(result.deletedIds)")
  })

  it("updates lesson counts without touching grammar or AI paths", () => {
    expect(lessonWorkspace).toContain("onWordsDeleted={(ids) => setWords")
    expect(lessonWorkspace).toContain("wordFilter={lessonWordFilter}")
    expect(workspace).toContain("analyzeVocabularyWord")
    expect(workspace).not.toContain("deleteGrammar")
  })

  it("submits only selected ids through a batched delete mapping", () => {
    expect(workspace).toContain("deleteVocabularyWords([...selectedIds])")
    expect(service).toContain('.from("vocabulary_words").delete().in("id", [...chunk]).select("id")')
    expect(service).not.toMatch(/deleteVocabularyWords[\s\S]*?\.eq\("user_id"/)
  })

  it("keeps mobile rows readable and the action bar above the safe area", () => {
    expect(styles).toContain('.vocabulary-row[data-selection="true"]')
    expect(styles).toContain("vocabulary-selection-bar")
    expect(styles).toContain("bottom:calc(5.25rem + env(safe-area-inset-bottom))")
    expect(styles).toContain("-webkit-line-clamp:2")
  })
})
