import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

import { APP_BRAND_NAME, APP_BRAND_SHORT_NAME } from "@/constants/brand"
import { getPrimaryPageFromPath, primaryPagePaths } from "@/lib/appNavigation"
import { getLearningCoursePath, getLearningRouteFromPath, getLearningViewFromPath, learningViewPaths } from "@/lib/learningNavigation"
import { canUsePersonalLearning } from "@/lib/learningRecords"
import { learningIndexItems, learningMorphItems } from "@/lib/learningEditorial"
import { primaryNavigationItems } from "@/lib/primaryNavigation"

describe("learning center foundation", () => {
  it("uses the upgraded brand names", () => {
    expect(APP_BRAND_NAME).toBe("努力也是一种天赋")
    expect(APP_BRAND_SHORT_NAME).toBe("努力天赋")
  })

  it("registers the learning route", () => expect(getPrimaryPageFromPath("/learning")).toBe("learning"))

  it("registers a direct-refreshable vocabulary route outside the Learning page", () => {
    expect(primaryPagePaths.vocabulary).toBe("/vocabulary")
    expect(getPrimaryPageFromPath("/vocabulary")).toBe("vocabulary")
    expect(learningViewPaths.words).toBe("/vocabulary")
    expect(getPrimaryPageFromPath("/learning/words")).toBe("learning")
  })

  it("keeps nested learning routes inside Learning", () => {
    expect(getPrimaryPageFromPath("/learning/today")).toBe("learning")
    expect(getLearningViewFromPath("/learning/today")).toBe("today")
    expect(getLearningViewFromPath("/learning/archive")).toBe("archive")
    expect(getLearningViewFromPath("/learning/timeline")).toBe("timeline")
  })

  it("supports stable encoded course routes and refresh parsing", () => {
    const path = getLearningCoursePath("course-数学/一")
    expect(path).toBe("/learning/course/course-%E6%95%B0%E5%AD%A6%2F%E4%B8%80")
    expect(getPrimaryPageFromPath(path)).toBe("learning")
    expect(getLearningRouteFromPath(path)).toEqual({ view: "course", courseKey: "course-数学/一" })
    expect(getLearningRouteFromPath("/learning/course/%E0%A4%A")).toEqual({ view: "hub", courseKey: null })
    expect(getPrimaryPageFromPath(path)).toBe("learning")
  })

  it("makes personal Learning available to both students and teachers", () => {
    expect(canUsePersonalLearning({ identityType: "student" })).toBe(true)
    expect(canUsePersonalLearning({ identityType: "teacher" })).toBe(true)
  })

  it("keeps all five primary navigation entries", () => {
    expect(primaryNavigationItems.map((item) => item.label)).toEqual(["课程表", "学习", "聊天", "待办", "我的"])
  })

  it("lists the five editorial learning index entries", () => {
    expect(learningIndexItems.map((item) => item.id)).toEqual(["today", "records", "archive", "words", "growth"])
  })

  it("uses real routes in the morph navigation", () => {
    expect(learningMorphItems.map((item) => item.view)).toEqual(["today", "timeline", "archive", "words"])
  })

  it("keeps the mobile course switcher, search, and sheet in the production page", () => {
    const source = readFileSync(new URL("./LearningPage.tsx", import.meta.url), "utf8")
    expect(source).toContain('className="learning-library-mobile-switch"')
    expect(source).toContain('className="learning-course-sheet"')
    expect(source).toContain('t("learning.searchCourses")')
  })

  it("keeps AI controls behind the existing feature flag", () => {
    const source = readFileSync(new URL("./LearningPage.tsx", import.meta.url), "utf8")
    expect(source).toContain("selected && LEARNING_AI_ENABLED")
    expect(source).toContain("LEARNING_AI_ENABLED && getLearningAnalysisAction")
  })

  it("renders one shared desktop and mobile module navigation with exclusive active state", () => {
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8")
    const navigation = readFileSync(new URL("../components/learning/LearningModuleNavigation.tsx", import.meta.url), "utf8")
    const vocabulary = readFileSync(new URL("./VocabularyPage.tsx", import.meta.url), "utf8")
    const japaneseWorkspace = readFileSync(new URL("../components/learning/JapaneseLessonWorkspace.tsx", import.meta.url), "utf8")
    const timetableAside = readFileSync(new URL("../components/workspace/TimetableWorkspaceAside.tsx", import.meta.url), "utf8")
    const styles = readFileSync(new URL("../index.css", import.meta.url), "utf8")
    expect(app).toContain('<LearningModuleNavigation active="library"')
    expect(app).toContain('<LearningModuleNavigation active="vocabulary"')
    expect(navigation).toContain('aria-current={active === "library" ? "page" : undefined}')
    expect(navigation).toContain('aria-current={active === "vocabulary" ? "page" : undefined}')
    expect(vocabulary).toContain("<JapaneseLessonWorkspace")
    expect(japaneseWorkspace).toContain("<VocabularyWorkspace")
    expect(timetableAside).toContain("onOpenVocabulary?.()")
    expect(styles).toContain(".learning-module-navigation")
    expect(styles).toContain("min-height:2.75rem")
  })

  it("describes the verified DeepSeek Learning and vocabulary capabilities in both languages", () => {
    const source = readFileSync(new URL("./AboutPage.tsx", import.meta.url), "utf8")
    expect(source).toContain("DeepSeek AI 学习整理")
    expect(source).toContain("按教材和课次整理")
    expect(source).toContain("逐词发音、个人笔记与 AI 辅助知识整理")
    expect(source).toContain("DeepSeek AI 学習整理")
    expect(source).toContain("教材・課ごとに整理")
  })
})
