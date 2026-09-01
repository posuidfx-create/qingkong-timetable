import { describe, expect, it } from "vitest"

import { getLocalizedRoleLabel } from "@/i18n/format"
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, readLocale, resolveLocale, saveLocale } from "@/i18n/locale"
import { jaJP } from "@/i18n/translations.ja-JP"
import { zhCN } from "@/i18n/translations.zh-CN"
import { primaryPagePaths } from "@/lib/appNavigation"
import { primaryNavigationItems } from "@/lib/primaryNavigation"
import { ABOUT_CONTENT, ABOUT_SECTION_ORDER } from "@/pages/AboutPage"
import { MemoryStorage } from "@/test/memoryStorage"

describe("i18n", () => {
  it("keeps zh-CN and ja-JP dictionary keys exactly aligned", () => {
    expect(Object.keys(jaJP).sort()).toEqual(Object.keys(zhCN).sort())
  })
  it("uses zh-CN by default and falls back from invalid values", () => {
    expect(DEFAULT_LOCALE).toBe("zh-CN")
    expect(resolveLocale("fr-FR")).toBe("zh-CN")
  })

  it("persists and reads ja-JP from app_locale", () => {
    const storage = new MemoryStorage()
    expect(saveLocale(storage, "ja-JP")).toBe("ja-JP")
    expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe("ja-JP")
    expect(readLocale(storage)).toBe("ja-JP")
  })

  it("provides Chinese and Japanese navigation without changing ids", () => {
    const keys = primaryNavigationItems.map((item) => item.labelKey)
    expect(keys.map((key) => zhCN[key])).toEqual(["课程表", "学习", "聊天", "待办", "我的"])
    expect(keys.map((key) => jaJP[key])).toEqual(["時間割", "学習", "チャット", "ToDo", "マイページ"])
    expect(primaryNavigationItems.map((item) => item.id)).toEqual(["timetable", "learning", "chat", "todo", "profile"])
  })

  it("translates role labels without changing stored values", () => {
    expect(getLocalizedRoleLabel("super_admin", "zh-CN")).toBe("超级管理员")
    expect(getLocalizedRoleLabel("super_admin", "ja-JP")).toBe("スーパー管理者")
  })

  it("exposes a complete bilingual About route", () => {
    expect(primaryPagePaths.about).toBe("/about")
    expect(ABOUT_CONTENT["zh-CN"].title).toContain("努力也是一种天赋")
    expect(ABOUT_CONTENT["zh-CN"].mobileTitle).toBe("关于本站")
    expect(ABOUT_CONTENT["zh-CN"].mobileBrandTitle).toBe("「努力也是一种天赋」")
    expect(ABOUT_CONTENT["ja-JP"].title).toContain("努力も才能のひとつ")
    expect(ABOUT_CONTENT["zh-CN"].disclaimer).toContain("不是大连东软信息学院")
    expect(ABOUT_CONTENT["ja-JP"].disclaimer).toContain("公式ウェブサイトではなく")
    expect(ABOUT_CONTENT["zh-CN"].frontendDescription).toContain("Cloudflare")
    expect(ABOUT_CONTENT["zh-CN"].dataDescription).toContain("Realtime")
    expect(ABOUT_CONTENT["zh-CN"].region).not.toMatch(/东京|新加坡|美国|香港/)
  })

  it("includes the final bilingual contact section and exact WeChat id", () => {
    expect(zhCN["about.contactTitle"]).toBe("联系我")
    expect(jaJP["about.contactTitle"]).toBe("お問い合わせ")
    expect(zhCN["about.contactBody"]).toContain("Bug")
    expect(jaJP["about.contactBody"]).toContain("不具合")
    expect("posuidx05").toBe("posuidx05")
    expect(ABOUT_SECTION_ORDER.at(-1)).toBe("contact")
  })

  it("covers the main Japanese controls without Chinese fallback", () => {
    expect(jaJP["auth.login"]).toBe("ログイン")
    expect(jaJP["timetable.previousWeek"]).toBe("前の週")
    expect(jaJP["chat.rooms"]).toBe("チャットルーム")
    expect(jaJP["todo.title"]).toBe("ToDo")
    expect(jaJP["profile.title"]).toBe("マイページ")
    expect(jaJP["theme.toLight"]).toBe("ライトモードに切り替え")
    expect(jaJP["common.save"]).toBe("保存")
    expect(zhCN["pixelMotion.title"]).toBe("像素动效")
    expect(jaJP["pixelMotion.title"]).toBe("ピクセルモーション")
    expect(jaJP["pixelMotion.reducedMotion"]).toContain("停止")
    expect(zhCN["pixelMotion.touchParticles"]).toBe("触摸粒子")
    expect(jaJP["pixelMotion.touchParticles"]).toBe("タッチパーティクル")
  })

  it("provides complete bilingual Learning record controls", () => {
    expect(zhCN["learning.todayTagline"]).toBe("记录今天学过的内容。")
    expect(jaJP["learning.todayTagline"]).toBe("今日学んだことを残します。")
    expect(zhCN["learning.takePhoto"]).toBe("拍照")
    expect(jaJP["learning.takePhoto"]).toBe("撮影")
    expect(zhCN["learning.deleteDescription"]).toBe("删除后无法恢复。")
    expect(jaJP["learning.deleteDescription"]).toBe("削除後は元に戻せません。")
    expect(zhCN["learning.contentRequired"]).toContain("至少添加一个附件")
    expect(jaJP["learning.contentRequired"]).toContain("添付ファイルを1件以上")
  })

  it("leaves user generated and course content untouched", () => {
    const userContent = "综合日语（三） · 张同学的待办"
    expect(jaJP["nav.timetable"]).toBe("時間割")
    expect(userContent).toBe("综合日语（三） · 张同学的待办")
  })
})
