import { describe, expect, it, vi } from "vitest"

import { applyPwaUpdate, dismissPwaUpdatePrompt, showPwaUpdatePrompt } from "@/lib/pwaUpdate"

describe("PWA update prompt state", () => {
  it("shows an available update when the service worker requests refresh", () => {
    expect(showPwaUpdatePrompt()).toBe("available")
  })

  it("only hides the prompt when the user chooses later", () => {
    expect(dismissPwaUpdatePrompt()).toBe("hidden")
    expect(showPwaUpdatePrompt()).toBe("available")
  })

  it("activates the waiting service worker before reloading", async () => {
    const update = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    await applyPwaUpdate(update)
    expect(update).toHaveBeenCalledWith(true)
  })
})
