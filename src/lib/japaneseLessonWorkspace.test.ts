import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const workspace = readFileSync(new URL("../components/learning/JapaneseLessonWorkspace.tsx", import.meta.url), "utf8")
const vocabularyPage = readFileSync(new URL("../pages/VocabularyPage.tsx", import.meta.url), "utf8")
const appNavigation = readFileSync(new URL("appNavigation.ts", import.meta.url), "utf8")
const styles = readFileSync(new URL("../index.css", import.meta.url), "utf8")

describe("Japanese Lesson Workspace contract", () => {
  it("shows textbook, both volumes and lessons without embedding copyrighted content", () => {
    expect(workspace).toContain('"vocabulary.minnaNoNihongo"')
    expect(workspace).toContain('renderVolume("beginner_2")')
    expect(workspace).toContain('renderVolume("beginner_1")')
    expect(workspace).not.toContain("みんなの日本語の完全な単語")
  })

  it("supports lesson direct refresh and nested vocabulary route activation", () => {
    expect(vocabularyPage).toContain("getLessonNumberFromPath(window.location.pathname)")
    expect(vocabularyPage).toContain("getLessonPath(nextLesson)")
    expect(appNavigation).toContain('pathname.startsWith(`${primaryPagePaths.vocabulary}/`)')
  })

  it("uses a mobile lesson picker and compact 5-column index", () => {
    expect(workspace).toContain("lesson-picker-grid")
    expect(workspace).toContain("responsive-bottom-sheet")
    expect(styles).toContain("grid-template-columns:repeat(5,minmax(0,1fr))")
    expect(styles).toContain("@media (max-width: 374px)")
  })

  it("never calls AI while opening or switching lessons", () => {
    expect(workspace).toContain("onClick={() => onAnalyze(Boolean(data))}")
    expect(workspace).not.toMatch(/useEffect\([^)]*analyzeVocabularyLesson/)
  })
})
