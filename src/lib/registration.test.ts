import { describe, expect, it } from "vitest"

import { emailConfirmationInstructions, emailConfirmationRequiredMessage, registrationTutorialSteps } from "@/lib/registration"

describe("registration email-confirmation guidance", () => {
  it("provides the registration tutorial including the confirmation action", () => {
    expect(registrationTutorialSteps).toHaveLength(6)
    expect(registrationTutorialSteps[4]).toContain("Confirm email address")
  })

  it("uses explicit confirmation-required success guidance", () => {
    expect(emailConfirmationRequiredMessage).toContain("邮箱完成验证")
    expect(emailConfirmationInstructions).toContain("Confirm email address")
  })
})
