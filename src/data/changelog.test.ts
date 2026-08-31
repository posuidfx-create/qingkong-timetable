import { describe, expect, it } from "vitest"

import { APP_VERSION } from "@/constants/appVersion"
import { changelog, changelogJa } from "@/data/changelog"

describe("changelog", () => {
  it("keeps the current version aligned with the first entry", () => expect(changelog[0].version).toBe(APP_VERSION))

  it("records only the v3.0.1 learning capabilities that are now available", () => {
    const currentChanges = changelog[0].changes.map((change) => change.text)
    expect(currentChanges.some((change) => change.includes("真实学习记录") && change.includes("图片、文档与音频"))).toBe(true)
    expect(currentChanges.some((change) => change.includes("仅添加附件"))).toBe(true)
    expect(currentChanges.some((change) => change.includes("Storage 清理"))).toBe(true)
    expect(currentChanges.join(" ")).not.toMatch(/OCR|TTS|AI分析|自动单词/)
  })

  it("records the learning image preview stability fix in both languages", () => {
    expect(changelog[0].changes.some((change) => change.text.includes("图片预览在保存时偶尔失效"))).toBe(true)
    expect(changelogJa[0].changes.some((change) => change.text.includes("画像プレビュー") && change.text.includes("保存時"))).toBe(true)
  })

  it("does not advertise the disabled Phase 24B AI analysis as released", () => {
    expect(changelog[0].changes.map((change) => change.text).join(" ")).not.toContain("AI 分析")
    expect(changelogJa[0].changes.map((change) => change.text).join(" ")).not.toContain("AI分析")
  })

  it("keeps versions newest first with one current version", () => {
    expect(changelog.filter((entry) => entry.isCurrent)).toHaveLength(1)
    expect(changelog.map((entry) => entry.version)).toEqual(["3.0.1", "3.0.0", "2.3.1", "2.3.0", "2.2.0", "2.1.0", "2.0.0", "1.4.0", "1.3.0", "1.2.0", "1.1.0", "1.0.0"])
  })

  it("marks v3 as a major update", () => {
    expect(changelog[1].major).toBe(true)
    expect(changelog[1].title).toContain("水系")
  })

  it("keeps a complete Japanese history with the same release order", () => {
    expect(changelogJa.map((entry) => entry.version)).toEqual(changelog.map((entry) => entry.version))
    expect(changelogJa[1].changes.some((change) => change.text.includes("日本語モード"))).toBe(true)
    expect(changelogJa[1].changes.some((change) => change.text.includes("学生・教員"))).toBe(true)
  })

  it.each(["努力也是一种天赋", "学习中心", "Aqua Liquid Glass", "原创高清水面壁纸", "动态水光播放与暂停", "版权风险的视频壁纸", "图片、文件、语音与视频", "待办支持图片与文档附件"])("summarizes the v3 capability: %s", (term) => {
    expect(changelog[1].changes.some((change) => change.text.includes(term))).toBe(true)
  })
})
