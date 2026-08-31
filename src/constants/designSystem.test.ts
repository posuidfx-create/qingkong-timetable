import { describe, expect, it } from "vitest"

import { DESIGN_TOKENS } from "@/constants/designSystem"
import { getPrimaryPageFromPath, primaryPagePaths } from "@/lib/appNavigation"
import { primaryNavigationItems } from "@/lib/primaryNavigation"

describe("quiet luxury design system", () => {
  it("keeps the neutral and sage palette stable", () => {
    expect(DESIGN_TOKENS.colors).toMatchObject({ background: "#F7F7F3", sage: "#73866F", border: "#DADDD6" })
  })

  it("defines the intended spacing, radius, and motion rhythm", () => {
    expect(DESIGN_TOKENS.spacing).toEqual([4, 8, 12, 16, 24, 32, 48, 64, 96])
    expect(DESIGN_TOKENS.radius).toEqual({ sm: 6, md: 10, lg: 16, xl: 20 })
    expect(DESIGN_TOKENS.motion.normal).toBe(240)
  })

  it("keeps the five primary navigation destinations and paths", () => {
    expect(primaryNavigationItems.map((item) => item.id)).toEqual(["timetable", "learning", "chat", "todo", "profile"])
    expect(primaryPagePaths.learning).toBe("/learning")
    expect(getPrimaryPageFromPath("/chat")).toBe("chat")
  })
})
