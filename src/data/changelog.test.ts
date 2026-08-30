import { describe, expect, it } from "vitest"

import { APP_VERSION } from "@/constants/appVersion"
import { changelog } from "@/data/changelog"

describe("changelog", () => {
  it("keeps the current version aligned with the first entry", () => expect(changelog[0].version).toBe(APP_VERSION))
  it("keeps versions newest first with one current version", () => { expect(changelog.filter((entry) => entry.isCurrent)).toHaveLength(1); expect(changelog.map((entry) => entry.version)).toEqual(["2.3.1", "2.3.0", "2.2.0", "2.1.0", "2.0.0", "1.4.0", "1.3.0", "1.2.0", "1.1.0", "1.0.0"]) })
  it("documents the current administrator todo attachment update", () => expect(changelog[0].changes.some((change) => change.text.includes("待办") && change.text.includes("附件"))).toBe(true))
})
