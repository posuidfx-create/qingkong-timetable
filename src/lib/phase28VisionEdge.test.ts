import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const learning = readFileSync(new URL("../../supabase/functions/analyze-learning-record/index.ts", import.meta.url), "utf8")
const provider = readFileSync(new URL("../../supabase/functions/analyze-learning-record/deepseek.ts", import.meta.url), "utf8")
const vocabulary = readFileSync(new URL("../../supabase/functions/extract-vocabulary-from-image/index.ts", import.meta.url), "utf8")

describe("Phase 28 DeepSeek Vision Edge security", () => {
  it("keeps both DeepSeek keys server-only and uses separate text and vision models", () => { expect(provider).toContain('DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash"'); expect(provider).toContain('DEFAULT_DEEPSEEK_VISION_MODEL = "deepseek-v4-flash-vision-exp"'); expect(learning).toContain('Deno.env.get("DEEPSEEK_API_KEY")'); expect(vocabulary).toContain('Deno.env.get("DEEPSEEK_API_KEY")') })
  it("validates JWT, actual image signatures and private Learning ownership", () => { expect(learning).toContain("admin.auth.getUser(token)"); expect(learning).toContain("record.user_id !== userData.user.id"); expect(learning).toContain("detectedImageMime(bytes) !== mime"); expect(vocabulary).toContain("detectedMime(bytes)") })
  it("supports an ownership-checked single asset target without analyzing sibling images", () => { expect(learning).toContain("requestedAssetId"); expect(learning).toContain("assets.filter((asset) => asset.id === requestedAssetId)"); expect(learning).toContain("asset.user_id !== userData.user.id"); expect(learning).toContain("const includeRecordText = requestedAssetId === null") })
  it("keeps unsupported assets uploaded and processes images independently with bounded concurrency", () => { expect(learning).toContain('status: "unsupported"'); expect(learning).toContain("slice(index, index + 2)"); expect(learning).toContain('processing_status: "failed"') })
  it("uses browser-safe CORS and ephemeral vocabulary images without Storage persistence", () => { for (const source of [learning, vocabulary]) { expect(source).toContain('"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"'); expect(source).toContain('request.method === "OPTIONS"') } expect(vocabulary).not.toContain("storage.from") })
  it("sends three to six tiles in one Vision request followed by one batch validation request", () => { expect(vocabulary).toContain('form.getAll("tiles")'); expect(vocabulary).toContain("requestDeepSeekMultiVisionJsonResult"); expect(vocabulary).toContain("requestDeepSeekJson"); expect(vocabulary).toContain("normalizeVocabularyValidationResponse"); expect(vocabulary).not.toContain("analyze-vocabulary-word") })
  it("logs safe stage counts without logging vocabulary or response content", () => {
    expect(vocabulary).toContain('console.info("[vocabulary vision] stages", extraction.stageDiagnostics)')
    const stageLog = vocabulary.slice(vocabulary.indexOf('console.info("[vocabulary vision] stages"'), vocabulary.indexOf('return response(200'))
    expect(stageLog).not.toMatch(/sourceText|result\.content|response body|prompt|bytes|apiKey/i)
  })
  it("logs only bounded transport diagnostics without secrets or image payloads", () => {
    expect(vocabulary).toContain('console.error("[vocabulary vision] failed", {')
    for (const field of ["errorName", "sanitizedMessage", "causeCode", "elapsedMs", "requestBodyBytes", "upstreamHttpStatus", "topLevelKeys", "choicesLength", "finishReason", "messageKeys", "contentType", "contentState", "contentLength", "trimmedLength", "firstNonWhitespaceClass", "lastNonWhitespaceClass", "hasJsonFence", "hasGenericFence", "looksLikeJSONObject", "looksLikeJSONArray", "jsonParseErrorName", "jsonParseErrorPosition", "hasReasoningContent", "reasoningContentLength", "hasToolCalls", "toolCallsCount", "promptTokens", "completionTokens", "reasoningTokens", "imageBytes", "imageMime"]) expect(vocabulary).toContain(field)
    expect(vocabulary).not.toContain("console.error(apiKey")
    expect(vocabulary).not.toContain("console.error(bytes")
    expect(vocabulary).not.toContain("console.error(raw")
    expect(vocabulary).not.toContain("reasoning_content")
    expect(vocabulary).not.toContain("console.error(result.content")
    expect(vocabulary).not.toContain("console.error(prompt")
  })

  it("disables thinking only for Vocabulary Vision and keeps JSON output enabled", () => {
    expect(vocabulary).toContain("{ thinkingDisabled: true, detailedOutputErrors: true }")
    expect(provider).toContain('response_format: { type: "json_object" }')
    expect(provider).toContain('...(options.thinkingDisabled ? { thinking: { type: "disabled" } } : {})')
    expect(learning).not.toContain("thinkingDisabled")
  })
})
