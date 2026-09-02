import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

const edgeSource = readFileSync(new URL("../../supabase/functions/analyze-learning-record/index.ts", import.meta.url), "utf8")
const providerSource = readFileSync(new URL("../../supabase/functions/analyze-learning-record/deepseek.ts", import.meta.url), "utf8")

describe("DeepSeek Edge Function security contract", () => {
  it("reads DeepSeek credentials only in the Edge Function and verifies the bearer user", () => {
    expect(edgeSource).toContain('Deno.env.get("DEEPSEEK_API_KEY")')
    expect(edgeSource).toContain('Deno.env.get("DEEPSEEK_MODEL")')
    expect(edgeSource).not.toMatch(/GEMINI|Gemini|gemini/)
    expect(providerSource).not.toContain("Deno.env")
    expect(edgeSource).not.toContain("VITE_DEEPSEEK")
    expect(edgeSource).toContain("bearerToken(request)")
    expect(edgeSource).toContain("admin.auth.getUser(token)")
    expect(edgeSource).toContain("record.user_id !== userData.user.id")
    expect(edgeSource).not.toContain("body.model")
  })

  it("uses the official OpenAI-compatible endpoint and JSON output", () => {
    expect(providerSource).toContain('https://api.deepseek.com/chat/completions')
    expect(providerSource).toContain('DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash"')
    expect(providerSource).toContain('response_format: { type: "json_object" }')
    expect(providerSource).toContain('Authorization: `Bearer ${apiKey}`')
  })

  it("answers browser preflight with the headers required by supabase.functions.invoke", () => {
    expect(edgeSource).toContain('request.method === "OPTIONS"')
    expect(edgeSource).toContain('"Access-Control-Allow-Origin": "*"')
    for (const header of ["authorization", "x-client-info", "apikey", "content-type"]) expect(edgeSource).toContain(header)
  })

  it("loads private images server-side without exposing public or signed URLs", () => {
    expect(edgeSource).toContain('admin.from("learning_assets")')
    expect(edgeSource).toContain("admin.storage")
    expect(edgeSource).toContain("requestDeepSeekVisionAnalysis")
    expect(edgeSource).toContain('status: "unsupported"')
    expect(edgeSource).not.toContain("createPublicUrl")
    expect(edgeSource).not.toContain("createSignedUrl")
  })

  it("persists the stable record analysis_json through service-managed columns", () => {
    expect(edgeSource).toContain("analysis_json: normalized.analysis")
    expect(edgeSource).toContain('processing_status: "processing"')
    expect(edgeSource).toContain('processing_status: "completed"')
    expect(edgeSource).toContain('processing_status: "failed"')
  })
})
