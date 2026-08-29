import { describe, expect, it } from "vitest"

import { normalizeEditableProfileFields } from "@/lib/profileForm"

describe("editable profile fields", () => {
  it("trims a valid username and converts an empty title to null", () => {
    expect(normalizeEditableProfileFields("  小晴  ", "   ")).toEqual({ username: "小晴", title: null })
  })

  it("rejects an empty username", () => {
    expect(() => normalizeEditableProfileFields("  ", null)).toThrow("昵称需为 1～40 个字符。")
  })

  it("rejects a title longer than 20 characters", () => {
    expect(() => normalizeEditableProfileFields("小晴", "很".repeat(21))).toThrow("头衔最多 20 个字符。")
  })
})
