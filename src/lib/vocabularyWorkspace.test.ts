import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const workspace = readFileSync(new URL("../components/learning/VocabularyWorkspace.tsx", import.meta.url), "utf8")
const detail = readFileSync(new URL("../components/learning/VocabularyWordDetailSheet.tsx", import.meta.url), "utf8")
const styles = readFileSync(new URL("../index.css", import.meta.url), "utf8")

describe("Vocabulary Workspace interaction contract", () => {
  it("makes every word independently playable and detail-accessible", () => {
    expect(workspace).toContain("vocabulary-row-word")
    expect(workspace).toContain("vocabulary-speaker")
    expect(workspace).toContain("setDetail(word)")
    expect(workspace).toContain("play(word)")
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
})
