import { describe, expect, it } from "vitest"

import { DESIGN_TOKENS } from "@/constants/designSystem"
import { getPrimaryPageFromPath, primaryPagePaths } from "@/lib/appNavigation"
import { primaryNavigationItems } from "@/lib/primaryNavigation"

describe("pixel editorial design system", () => {
  it("keeps the pure gray canvas and carbon palette stable", () => {
    expect(DESIGN_TOKENS.colors).toMatchObject({ background: "#F5F5F5", foreground: "#1D1D1F", border: "#D7D7D4", darkCanvas: "#171717" })
  })

  it("defines the intended spacing, radius, and motion rhythm", () => {
    expect(DESIGN_TOKENS.spacing).toEqual([4, 8, 12, 16, 24, 32, 48, 64, 96])
    expect(DESIGN_TOKENS.radius).toEqual({ sm: 4, md: 6, lg: 8, xl: 10 })
    expect(DESIGN_TOKENS.motion.normal).toBe(240)
  })

  it("keeps the five primary navigation destinations and paths", () => {
    expect(primaryNavigationItems.map((item) => item.id)).toEqual(["timetable", "learning", "chat", "todo", "profile"])
    expect(primaryPagePaths.learning).toBe("/learning")
    expect(getPrimaryPageFromPath("/chat")).toBe("chat")
  })
})
