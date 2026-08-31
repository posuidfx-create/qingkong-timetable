import { describe, expect, it } from "vitest"

import { APP_BRAND_NAME, APP_BRAND_SHORT_NAME } from "@/constants/brand"
import { getPrimaryPageFromPath } from "@/lib/appNavigation"
import { getLearningViewFromPath } from "@/lib/learningNavigation"
import { canUsePersonalLearning } from "@/lib/learningRecords"
import { learningCards } from "@/lib/learning"
import { primaryNavigationItems } from "@/lib/primaryNavigation"

describe("learning center foundation", () => {
  it("uses the upgraded brand names", () => {
    expect(APP_BRAND_NAME).toBe("努力也是一种天赋")
    expect(APP_BRAND_SHORT_NAME).toBe("努力天赋")
  })

  it("registers the learning route", () => expect(getPrimaryPageFromPath("/learning")).toBe("learning"))

  it("keeps nested learning routes inside Learning", () => {
    expect(getPrimaryPageFromPath("/learning/today")).toBe("learning")
    expect(getLearningViewFromPath("/learning/today")).toBe("today")
    expect(getLearningViewFromPath("/learning/archive")).toBe("archive")
    expect(getLearningViewFromPath("/learning/timeline")).toBe("timeline")
  })

  it("makes personal Learning available to both students and teachers", () => {
    expect(canUsePersonalLearning({ identityType: "student" })).toBe(true)
    expect(canUsePersonalLearning({ identityType: "teacher" })).toBe(true)
  })

  it("keeps all five primary navigation entries", () => {
    expect(primaryNavigationItems.map((item) => item.label)).toEqual(["课程表", "学习", "聊天", "待办", "我的"])
  })

  it("lists the learning center foundation cards", () => {
    expect(learningCards.map((card) => card.title)).toEqual(["今日记录", "课程档案", "单词本", "学习成果", "成长时间线"])
  })
})
