import { describe, expect, it } from "vitest"

import { APP_VERSION } from "@/constants/appVersion"
import { changelog, changelogJa } from "@/data/changelog"

describe("changelog", () => {
  it("keeps the current version aligned with the first entry", () => expect(changelog[0].version).toBe(APP_VERSION))

  it("preserves only the released v3.0.1 learning capabilities", () => {
    const v301Changes = changelog[2].changes.map((change) => change.text)
    expect(changelog[2].version).toBe("3.0.1")
    expect(v301Changes.some((change) => change.includes("真实学习记录") && change.includes("图片、文档与音频"))).toBe(true)
    expect(v301Changes.some((change) => change.includes("仅添加附件"))).toBe(true)
    expect(v301Changes.some((change) => change.includes("Storage 清理"))).toBe(true)
    expect(v301Changes.join(" ")).not.toMatch(/Pixel|像素|壁纸|OCR|TTS|AI分析|自动单词/)
  })

  it("records the learning image preview stability fix in both languages", () => {
    expect(changelog[2].changes.some((change) => change.text.includes("图片预览在保存时偶尔失效"))).toBe(true)
    expect(changelogJa[2].changes.some((change) => change.text.includes("画像プレビュー") && change.text.includes("保存時"))).toBe(true)
  })

  it("records the editorial Learning UI in both languages", () => {
    expect(changelog[1].changes.some((change) => change.text.includes("编辑式学习档案") && change.text.includes("最近记录流"))).toBe(true)
    expect(changelogJa[1].changes.some((change) => change.text.includes("編集型アーカイブ") && change.text.includes("最近の記録"))).toBe(true)
  })

  it("records the pixel editorial visual update in both languages", () => {
    expect(changelog[1].changes.map((change) => change.text).join(" ")).toContain("浅灰编辑式画布")
    expect(changelog[1].changes.map((change) => change.text).join(" ")).toContain("像素爱心")
    expect(changelog[1].changes.map((change) => change.text).join(" ")).toContain("鼠标像素互动")
    expect(changelogJa[1].changes.map((change) => change.text).join(" ")).toContain("ライトグレー")
    expect(changelogJa[1].changes.map((change) => change.text).join(" ")).toContain("ピクセルハート")
  })

  it("records the user-facing pixel motion settings in both languages", () => {
    expect(changelog[1].changes.map((change) => change.text).join(" ")).toContain("像素动效设置")
    expect(changelog[1].changes.map((change) => change.text).join(" ")).toContain("透明度")
    expect(changelog[1].changes.map((change) => change.text).join(" ")).toContain("粒子效果")
    expect(changelogJa[1].changes.map((change) => change.text).join(" ")).toContain("ピクセルモーション設定")
    expect(changelogJa[1].changes.map((change) => change.text).join(" ")).toContain("透明度")
    expect(changelogJa[1].changes.map((change) => change.text).join(" ")).toContain("粒子効果")
  })

  it("records the mobile pixel motion polish in both languages", () => {
    expect(changelog[1].changes.map((change) => change.text).join(" ")).toContain("移动端")
    expect(changelog[1].changes.map((change) => change.text).join(" ")).toContain("触摸像素反馈")
    expect(changelog[1].changes.map((change) => change.text).join(" ")).toContain("独立设置背景爱心数量")
    expect(changelogJa[1].changes.map((change) => change.text).join(" ")).toContain("モバイル")
    expect(changelogJa[1].changes.map((change) => change.text).join(" ")).toContain("タッチパーティクル")
    expect(changelogJa[1].changes.map((change) => change.text).join(" ")).toContain("個別に設定")
  })

  it("records the verified DeepSeek text analysis and vocabulary workspace in both languages", () => {
    expect(changelog[0].changes.map((change) => change.text).join(" ")).toContain("DeepSeek AI 学习整理")
    expect(changelog[0].changes.map((change) => change.text).join(" ")).toContain("逐词播放")
    expect(changelogJa[0].changes.map((change) => change.text).join(" ")).toContain("DeepSeek AI 学習整理")
    expect(changelogJa[0].changes.map((change) => change.text).join(" ")).toContain("単語ごとの発音")
    expect(changelog[0].changes.map((change) => change.text).join(" ")).toContain("课程知识库与日语学习之间快速切换")
    expect(changelog[0].changes.map((change) => change.text).join(" ")).toContain("按教材与课次整理")
    expect(changelogJa[0].changes.map((change) => change.text).join(" ")).toContain("授業ナレッジと日本語学習")
  })

  it("keeps versions newest first with one current version", () => {
    expect(changelog.filter((entry) => entry.isCurrent)).toHaveLength(1)
    expect(changelog.map((entry) => entry.version)).toEqual(["3.1.0", "3.0.2", "3.0.1", "3.0.0", "2.3.1", "2.3.0", "2.2.0", "2.1.0", "2.0.0", "1.4.0", "1.3.0", "1.2.0", "1.1.0", "1.0.0"])
  })

  it("marks v3 as a major update", () => {
    expect(changelog[3].major).toBe(true)
    expect(changelog[3].title).toContain("水系")
  })

  it("keeps a complete Japanese history with the same release order", () => {
    expect(changelogJa.map((entry) => entry.version)).toEqual(changelog.map((entry) => entry.version))
    expect(changelogJa[3].changes.some((change) => change.text.includes("日本語モード"))).toBe(true)
    expect(changelogJa[3].changes.some((change) => change.text.includes("学生・教員"))).toBe(true)
  })

  it.each(["努力也是一种天赋", "学习中心", "Aqua Liquid Glass", "原创高清水面壁纸", "动态水光播放与暂停", "版权风险的视频壁纸", "图片、文件、语音与视频", "待办支持图片与文档附件"])("summarizes the v3 capability: %s", (term) => {
    expect(changelog[3].changes.some((change) => change.text.includes(term))).toBe(true)
  })
})
