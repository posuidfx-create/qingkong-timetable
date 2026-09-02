import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const panel = readFileSync(new URL("./CourseCommonsPanel.tsx", import.meta.url), "utf8")
const publish = readFileSync(new URL("./PublishContributionSheet.tsx", import.meta.url), "utf8")
const form = readFileSync(new URL("./LearningRecordFormSheet.tsx", import.meta.url), "utf8")
const page = readFileSync(new URL("../../pages/LearningPage.tsx", import.meta.url), "utf8")
const css = readFileSync(new URL("../../index.css", import.meta.url), "utf8")

describe("Course Commons UI", () => {
  it("adds Public Knowledge as the default course section without removing private views", () => { expect(page).toContain('useState<CourseSection>("commons")'); expect(page).toContain('["commons", "overview", "materials", "timeline"]'); expect(page).toContain("<CourseCommonsPanel") })
  it("renders search, type filters, empty state, and editorial rows", () => { expect(panel).toContain("filterCourseContributions"); expect(panel).toContain("courseCommons.filterAll"); expect(panel).toContain("courseCommons.empty"); expect(css).toContain(".course-commons__feed article") })
  it("keeps detail actions for bookmark, quote, report, author editing and unpublish", () => { for (const term of ["toggleContributionBookmark", "quoteContributionToLearning", "reportContribution", "updatePublishedContribution", "unpublishContribution"]) expect(panel).toContain(term) })
  it("defaults attached files to private and requires an explicit rights confirmation", () => { expect(publish).toContain("setAssetIds([])"); expect(publish).toContain("confirmAssetRights"); expect(form).toContain("sharedDraftIds"); expect(form).toContain("rightsConfirmation") })
  it("shows the new-record sharing control only when a stable course can be resolved", () => { expect(form).toContain("shareToCourse"); expect(form).toContain("courseOptions.some"); expect(form).toContain("course_required") })
  it("uses a full-height, safe-area-aware mobile inspector with 44px actions", () => { expect(css).toContain("height:100dvh"); expect(css).toContain("env(safe-area-inset-bottom)"); expect(css).toContain("min-height:2.75rem") })
})
