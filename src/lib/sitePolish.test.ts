import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8")
const appShell = readFileSync(new URL("../components/layout/AppShell.tsx", import.meta.url), "utf8")
const imagePreview = readFileSync(new URL("../components/shared/ImagePreview.tsx", import.meta.url), "utf8")
const learningPage = readFileSync(new URL("../pages/LearningPage.tsx", import.meta.url), "utf8")
const commons = readFileSync(new URL("../components/learning/CourseCommonsPanel.tsx", import.meta.url), "utf8")
const styles = readFileSync(new URL("../index.css", import.meta.url), "utf8")
const viteConfig = readFileSync(new URL("../../vite.config.ts", import.meta.url), "utf8")
const updatePrompt = readFileSync(new URL("../components/layout/MajorUpdatePrompt.tsx", import.meta.url), "utf8")
const aboutPage = readFileSync(new URL("../pages/AboutPage.tsx", import.meta.url), "utf8")

describe("v3.4 site polish contracts", () => {
  it("loads authenticated feature pages at route level", () => {
    for (const page of ["TimetablePage", "LearningPage", "VocabularyPage", "ChatPage", "TodoPage", "ProfilePage", "StatisticsPage", "ChangelogPage", "AboutPage"]) {
      expect(app).toContain(`const ${page} = lazy(`)
    }
    expect(app).toContain("<Suspense fallback={<RouteLoading")
  })

  it("keeps navigation landmarks and current utility state accessible", () => {
    expect(appShell).toContain('<aside className="workspace-rail" aria-label={t("nav.primary")}')
    expect(appShell).toContain('aria-label={t("nav.profile")}')
    expect(appShell).toContain('data-active={activePage === "vocabulary"}')
    expect(appShell).toContain('aria-current={activePage === "vocabulary" ? "page" : undefined}')
  })

  it("uses one explicit image viewer close action with stable media rendering", () => {
    expect(imagePreview).toContain("showCloseButton={false}")
    expect(imagePreview).toContain('decoding="async"')
    expect(imagePreview).toContain('loading="lazy"')
    expect(imagePreview).toContain('role="status"')
  })

  it("distinguishes public course knowledge from private learning", () => {
    expect(commons).toContain('t("courseCommons.publicVersion")')
    expect(learningPage).toContain('t("courseCommons.privateOnly")')
    expect(commons).toContain("Globe2")
    expect(learningPage).toContain("LockKeyhole")
  })

  it("keeps touch targets, reduced motion, and PWA cache cleanup explicit", () => {
    expect(styles).toContain("@media (pointer: coarse)")
    expect(styles).toContain("--control-touch-size: 2.75rem")
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)")
    expect(viteConfig).toContain("cleanupOutdatedCaches: true")
    expect(viteConfig).not.toMatch(/runtimeCaching|supabase\.co|signed[_-]?url/i)
  })

  it("derives the visible update version from APP_VERSION without legacy water copy", () => {
    expect(updatePrompt).toContain("APP_VERSION_TAG")
    expect(updatePrompt).toContain("LayoutPanelTop")
    expect(updatePrompt).not.toMatch(/Droplets|v3\.1\.0|水系/)
  })

  it("exposes one responsive About heading name to assistive technology", () => {
    expect(aboutPage).toContain("aria-label={copy.title}")
    expect(aboutPage.match(/aria-hidden="true" className="about-title-/g)).toHaveLength(2)
  })
})
