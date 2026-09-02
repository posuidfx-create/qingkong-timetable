import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { jaJP } from "@/i18n/translations.ja-JP"
import { zhCN } from "@/i18n/translations.zh-CN"

const appShell = readFileSync(new URL("../components/layout/AppShell.tsx", import.meta.url), "utf8")
const languageMenu = readFileSync(new URL("../components/layout/LanguageMenu.tsx", import.meta.url), "utf8")
const styles = readFileSync(new URL("../index.css", import.meta.url), "utf8")

describe("header utility navigation", () => {
  it("uses distinct Lucide icons for Vocabulary and locale switching", () => {
    expect(appShell).toContain("BookOpenText")
    expect(appShell).not.toContain("<Languages")
    expect(languageMenu).toContain("<Languages")
  })

  it("keeps Vocabulary navigation and distinct accessible labels", () => {
    expect(appShell).toContain('onPageChange("vocabulary")')
    expect(appShell).toContain('aria-label={t("utility.openVocabulary")}')
    expect(appShell).toContain('title={t("utility.vocabulary")}')
    expect(languageMenu).toContain('aria-label={t("utility.switchLanguage")}')
    expect(languageMenu).toContain('title={t("utility.switchLanguage")}')
    expect(zhCN["utility.openVocabulary"]).toBe("打开单词本")
    expect(zhCN["utility.switchLanguage"]).toBe("切换语言")
    expect(jaJP["utility.openVocabulary"]).toBe("単語帳を開く")
    expect(jaJP["utility.switchLanguage"]).toBe("言語を切り替える")
  })

  it("keeps the existing locale switch behavior", () => {
    expect(languageMenu).toContain("setLocale(option.value)")
    expect(languageMenu).toContain('value: "zh-CN"')
    expect(languageMenu).toContain('value: "ja-JP"')
  })

  it("keeps 44px mobile touch targets without horizontal page overflow", () => {
    expect(styles).toContain("overflow-x: clip")
    expect(styles).toMatch(/\.workspace-utility-button\s*\{[\s\S]*?min-width:\s*2\.75rem;[\s\S]*?min-height:\s*2\.75rem;/)
    expect(styles).toMatch(/@media \(max-width: 47\.99rem\)[\s\S]*?\.app-shell-utility\s*\{[\s\S]*?gap:\s*0;/)
  })
})
