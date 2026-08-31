import { describe, expect, it } from "vitest"

import { isLearningAiFeatureEnabled, LEARNING_AI_ENABLED } from "@/constants/features"

describe("learning AI feature flag", () => {
  it("is disabled when the environment variable is missing", () => {
    expect(isLearningAiFeatureEnabled(undefined)).toBe(false)
    expect(LEARNING_AI_ENABLED).toBe(false)
  })

  it("is enabled only by the exact public boolean value true", () => {
    expect(isLearningAiFeatureEnabled("true")).toBe(true)
    expect(isLearningAiFeatureEnabled("false")).toBe(false)
    expect(isLearningAiFeatureEnabled("TRUE")).toBe(false)
    expect(isLearningAiFeatureEnabled(true)).toBe(false)
  })
})
