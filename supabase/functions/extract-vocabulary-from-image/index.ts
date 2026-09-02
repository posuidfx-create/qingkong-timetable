import { createClient } from "npm:@supabase/supabase-js@2"

import { DEFAULT_DEEPSEEK_VISION_MODEL, DeepSeekApiError, DeepSeekTransportError, requestDeepSeekVisionJsonResult, type DeepSeekRequestDiagnostics } from "../analyze-learning-record/deepseek.ts"
import { buildVocabularyImagePrompt, normalizeVocabularyTransportResponse, VocabularyResponseError } from "./analysis.ts"

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
const maxBytes = 15 * 1024 * 1024

function response(status: number, body: Record<string, unknown>) { return new Response(JSON.stringify(body), { status, headers: jsonHeaders }) }
function bearerToken(request: Request) { const header = request.headers.get("Authorization") ?? ""; return header.startsWith("Bearer ") ? header.slice(7).trim() || null : null }
function detectedMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png"
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP") return "image/webp"
  if (bytes.length >= 6 && /^GIF8[79]a$/.test(new TextDecoder().decode(bytes.subarray(0, 6)))) return "image/gif"
  return null
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return response(405, { code: "method_not_allowed" })
  const token = bearerToken(request)
  if (!token) return response(401, { code: "auth_required" })
  const supabaseUrl = Deno.env.get("SUPABASE_URL"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY"); const apiKey = Deno.env.get("DEEPSEEK_API_KEY")
  if (!supabaseUrl || !serviceKey) return response(503, { code: "backend_not_configured" })
  if (!apiKey) return response(503, { code: "deepseek_not_configured" })
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user?.id) return response(401, { code: "auth_required" })
  let form: FormData
  try { form = await request.formData() } catch { return response(400, { code: "invalid_request" }) }
  const file = form.get("image"); const lessonNumber = Number(form.get("lessonNumber"))
  if (!(file instanceof File) || !Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > 50) return response(400, { code: "invalid_request" })
  if (file.size < 1 || file.size > maxBytes) return response(400, { code: "invalid_image_size" })
  const bytes = new Uint8Array(await file.arrayBuffer()); const mime = detectedMime(bytes)
  if (!mime || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime)) return response(415, { code: "unsupported_image" })
  const startedAt = Date.now()
  try {
    const model = Deno.env.get("DEEPSEEK_VISION_MODEL") ?? DEFAULT_DEEPSEEK_VISION_MODEL
    const result = await requestDeepSeekVisionJsonResult(apiKey, model, buildVocabularyImagePrompt(lessonNumber), mime, bytes, 2_048, fetch, { thinkingDisabled: true, detailedOutputErrors: true })
    return response(200, { extraction: normalizeVocabularyTransportResponse(result.content, result.diagnostics), model })
  } catch (reason) {
    const status = reason instanceof DeepSeekApiError ? reason.status : null
    const code = reason instanceof VocabularyResponseError ? reason.code : reason instanceof DeepSeekTransportError ? reason.code : "provider_error"
    const vocabularyError = reason instanceof VocabularyResponseError ? reason as VocabularyResponseError<DeepSeekRequestDiagnostics> : null
    const diagnostic = reason instanceof DeepSeekTransportError || reason instanceof DeepSeekApiError ? reason.diagnostics : vocabularyError?.transportDiagnostics ?? null
    const fingerprint = vocabularyError?.fingerprint ?? null
    console.error("[vocabulary vision] failed", {
      code,
      status,
      errorName: reason instanceof Error ? reason.name : "UnknownError",
      sanitizedMessage: diagnostic?.sanitizedMessage ?? "vocabulary response validation failed",
      causeCode: diagnostic?.causeCode ?? null,
      elapsedMs: diagnostic?.elapsedMs ?? Date.now() - startedAt,
      requestBodyBytes: diagnostic?.requestBodyBytes ?? null,
      upstreamHttpStatus: diagnostic?.response?.upstreamHttpStatus ?? status,
      topLevelKeys: diagnostic?.response?.topLevelKeys ?? [],
      choicesLength: diagnostic?.response?.choicesLength ?? null,
      finishReason: diagnostic?.response?.finishReason ?? null,
      messageKeys: diagnostic?.response?.messageKeys ?? [],
      contentType: fingerprint?.contentType ?? diagnostic?.response?.contentType ?? null,
      contentState: diagnostic?.response?.contentState ?? null,
      contentLength: fingerprint?.contentLength ?? diagnostic?.response?.contentLength ?? null,
      trimmedLength: fingerprint?.trimmedLength ?? null,
      firstNonWhitespaceClass: fingerprint?.firstNonWhitespaceClass ?? null,
      lastNonWhitespaceClass: fingerprint?.lastNonWhitespaceClass ?? null,
      hasJsonFence: fingerprint?.hasJsonFence ?? false,
      hasGenericFence: fingerprint?.hasGenericFence ?? false,
      looksLikeJSONObject: fingerprint?.looksLikeJSONObject ?? false,
      looksLikeJSONArray: fingerprint?.looksLikeJSONArray ?? false,
      jsonParseErrorName: fingerprint?.jsonParseErrorName ?? null,
      jsonParseErrorPosition: fingerprint?.jsonParseErrorPosition ?? null,
      hasReasoningContent: diagnostic?.response?.hasReasoningContent ?? false,
      reasoningContentLength: diagnostic?.response?.reasoningContentLength ?? null,
      hasToolCalls: diagnostic?.response?.hasToolCalls ?? false,
      toolCallsCount: diagnostic?.response?.toolCallsCount ?? null,
      promptTokens: diagnostic?.response?.promptTokens ?? null,
      completionTokens: diagnostic?.response?.completionTokens ?? null,
      reasoningTokens: diagnostic?.response?.reasoningTokens ?? null,
      imageBytes: bytes.byteLength,
      imageMime: mime,
    })
    const responseStatus = status && status >= 400 && status <= 599 ? status : code === "provider_timeout" ? 504 : code.startsWith("provider_") ? 502 : 422
    return response(responseStatus, { code })
  }
})
