import { describe, expect, it } from "vitest"

import { APP_VERSION, APP_VERSION_TAG } from "@/constants/appVersion"
import { isVersionOlder, MAJOR_UPDATE_TITLE, markMajorUpdateSeen, PWA_REINSTALL_NOTICE, PWA_REINSTALL_NOTICE_JA, SEEN_VERSION_STORAGE_KEY, shouldShowMajorUpdate } from "@/lib/versionAnnouncement"

function createStorage(initial?: string): Storage {
  const values = new Map<string, string>()
  if (initial) values.set(SEEN_VERSION_STORAGE_KEY, initial)
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) } } as Pick<Storage, "getItem" | "setItem"> as Storage
}

describe("v3 release announcement", () => {
  it("uses v3.0.1 as the single release version source", () => {
    expect(APP_VERSION).toBe("3.0.1")
    expect(APP_VERSION_TAG).toBe("v3.0.1")
    expect(MAJOR_UPDATE_TITLE).toBe("v3.0.1 全新升级")
  })

  it("shows for a first visit or an older version", () => {
    expect(shouldShowMajorUpdate(createStorage())).toBe(true)
    expect(shouldShowMajorUpdate(createStorage("v2.3.1"))).toBe(true)
    expect(isVersionOlder("v2.3.1")).toBe(true)
  })

  it("persists dismissal and does not show again for v3", () => {
    const storage = createStorage()
    expect(markMajorUpdateSeen(storage)).toBe("v3.0.1")
    expect(storage.getItem(SEEN_VERSION_STORAGE_KEY)).toBe("v3.0.1")
    expect(shouldShowMajorUpdate(storage)).toBe(false)
  })

  it("contains the PWA reinstall guidance", () => {
    expect(PWA_REINSTALL_NOTICE).toContain("删除旧 App")
    expect(PWA_REINSTALL_NOTICE).toContain("重新添加到桌面")
  })

  it("contains the Japanese PWA reinstall guidance", () => {
    expect(PWA_REINSTALL_NOTICE_JA).toContain("旧アプリを一度削除")
    expect(PWA_REINSTALL_NOTICE_JA).toContain("もう一度アプリとして追加")
  })
})
