// @ts-expect-error Deno Edge Functions require explicit TypeScript extensions.
import { buildLearningImageAnalysisPrompt, buildLearningTextAnalysisPrompt, normalizeLearningAnalysisResponse, type LearningAnalysisRecordData, type NormalizedLearningAnalysis } from "./analysis.ts"

export const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash"
export const DEFAULT_DEEPSEEK_VISION_MODEL = "deepseek-v4-flash-vision-exp"
export const DEEPSEEK_CHAT_COMPLETIONS_URL = "https://api.deepseek.com/chat/completions"

export class DeepSeekApiError extends Error {
  constructor(public readonly status: number | null, public readonly diagnostics: DeepSeekRequestDiagnostics | null = null) { super("deepseek_failed") }
}

export type DeepSeekTransportErrorCode =
  | "provider_timeout"
  | "provider_network_error"
  | "provider_invalid_response"
  | "provider_empty_content"
  | "provider_output_truncated"
  | "provider_content_filtered"
  | "provider_resource_error"

export interface DeepSeekResponseDiagnostics {
  upstreamHttpStatus: number
  topLevelKeys: string[]
  choicesLength: number | null
  finishReason: string | null
  messageKeys: string[]
  contentType: "string" | "array" | "object" | "null" | "other"
  contentState: "missing" | "null" | "empty" | "non-empty"
  contentLength: number | null
  hasReasoningContent: boolean
  reasoningContentLength: number | null
  hasToolCalls: boolean
  toolCallsCount: number | null
  promptTokens: number | null
  completionTokens: number | null
  reasoningTokens: number | null
}

export interface DeepSeekRequestDiagnostics {
  elapsedMs: number
  requestBodyBytes: number
  causeCode: string | null
  sanitizedMessage: string
  response: DeepSeekResponseDiagnostics | null
}

export class DeepSeekTransportError extends Error {
  constructor(public readonly code: DeepSeekTransportErrorCode, public readonly diagnostics: DeepSeekRequestDiagnostics) {
    super(code)
    this.name = "DeepSeekTransportError"
  }
}

export type DeepSeekFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export interface DeepSeekVisionRequestOptions {
  thinkingDisabled?: boolean
  detailedOutputErrors?: boolean
}

export interface DeepSeekVisionJsonResult {
  content: string
  diagnostics: DeepSeekRequestDiagnostics
}

export interface DeepSeekVisionImage {
  mimeType: string
  bytes: Uint8Array
}

export async function requestDeepSeekJson(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens = 2_048,
  fetcher: DeepSeekFetch = fetch,
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  try {
    const result = await fetcher(DEEPSEEK_CHAT_COMPLETIONS_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a careful learning assistant. Return valid JSON only and follow the requested JSON shape exactly." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: maxTokens,
        stream: false,
      }),
    })
    if (!result.ok) throw new DeepSeekApiError(result.status)
    const payload: unknown = await result.json()
    const choices = payload && typeof payload === "object" && Array.isArray((payload as { choices?: unknown }).choices)
      ? (payload as { choices: Array<{ message?: { content?: unknown } }> }).choices
      : []
    const content = choices[0]?.message?.content
    if (typeof content !== "string" || !content.trim()) throw new Error("invalid_ai_response")
    return content
  } finally {
    clearTimeout(timeout)
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let offset = 0; offset < bytes.length; offset += 32_768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768))
  return btoa(binary)
}

function safeCauseCode(reason: unknown): string | null {
  if (!reason || typeof reason !== "object" || !("code" in reason)) return null
  const value = String((reason as { code?: unknown }).code ?? "")
  return /^[A-Z0-9_]{1,40}$/.test(value) ? value : null
}

function safeKeys(value: unknown): string[] {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value).slice(0, 30).map((key) => key.slice(0, 80))
    : []
}

function safeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null
}

export function buildDeepSeekResponseDiagnostics(payload: unknown, httpStatus: number): DeepSeekResponseDiagnostics {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null
  const choices = root && Array.isArray(root.choices) ? root.choices : null
  const firstChoice = choices?.[0] && typeof choices[0] === "object" && !Array.isArray(choices[0]) ? choices[0] as Record<string, unknown> : null
  const message = firstChoice?.message && typeof firstChoice.message === "object" && !Array.isArray(firstChoice.message) ? firstChoice.message as Record<string, unknown> : null
  const content = message?.content
  const reasoningContent = message?.reasoning_content
  const toolCalls = message?.tool_calls
  const usage = root?.usage && typeof root.usage === "object" && !Array.isArray(root.usage) ? root.usage as Record<string, unknown> : null
  const completionDetails = usage?.completion_tokens_details && typeof usage.completion_tokens_details === "object" && !Array.isArray(usage.completion_tokens_details)
    ? usage.completion_tokens_details as Record<string, unknown>
    : null
  return {
    upstreamHttpStatus: httpStatus,
    topLevelKeys: safeKeys(root),
    choicesLength: choices?.length ?? null,
    finishReason: typeof firstChoice?.finish_reason === "string" ? firstChoice.finish_reason.slice(0, 80) : null,
    messageKeys: safeKeys(message),
    contentType: content === null ? "null" : typeof content === "string" ? "string" : Array.isArray(content) ? "array" : typeof content === "object" ? "object" : "other",
    contentState: !("content" in (message ?? {})) ? "missing" : content === null ? "null" : typeof content === "string" && content.length === 0 ? "empty" : typeof content === "string" ? "non-empty" : "missing",
    contentLength: typeof content === "string" ? content.length : null,
    hasReasoningContent: typeof reasoningContent === "string" || reasoningContent !== undefined,
    reasoningContentLength: typeof reasoningContent === "string" ? reasoningContent.length : null,
    hasToolCalls: Array.isArray(toolCalls),
    toolCallsCount: Array.isArray(toolCalls) ? toolCalls.length : null,
    promptTokens: safeInteger(usage?.prompt_tokens),
    completionTokens: safeInteger(usage?.completion_tokens),
    reasoningTokens: safeInteger(completionDetails?.reasoning_tokens ?? usage?.reasoning_tokens),
  }
}

export async function requestDeepSeekVisionAnalysis(
  apiKey: string,
  model: string,
  record: LearningAnalysisRecordData,
  assetName: string,
  mimeType: string,
  bytes: Uint8Array,
  fetcher: DeepSeekFetch = fetch,
): Promise<NormalizedLearningAnalysis> {
  return normalizeLearningAnalysisResponse(await requestDeepSeekVisionJson(apiKey, model, buildLearningImageAnalysisPrompt(record, assetName), mimeType, bytes, 2_048, fetcher))
}

export async function requestDeepSeekVisionJson(
  apiKey: string,
  model: string,
  prompt: string,
  mimeType: string,
  bytes: Uint8Array,
  maxTokens = 2_048,
  fetcher: DeepSeekFetch = fetch,
  options: DeepSeekVisionRequestOptions = {},
): Promise<string> {
  return (await requestDeepSeekVisionJsonResult(apiKey, model, prompt, mimeType, bytes, maxTokens, fetcher, options)).content
}

export async function requestDeepSeekVisionJsonResult(
  apiKey: string,
  model: string,
  prompt: string,
  mimeType: string,
  bytes: Uint8Array,
  maxTokens = 2_048,
  fetcher: DeepSeekFetch = fetch,
  options: DeepSeekVisionRequestOptions = {},
): Promise<DeepSeekVisionJsonResult> {
  return requestDeepSeekMultiVisionJsonResult(apiKey, model, prompt, [{ mimeType, bytes }], maxTokens, fetcher, options)
}

export async function requestDeepSeekMultiVisionJsonResult(
  apiKey: string,
  model: string,
  prompt: string,
  images: readonly DeepSeekVisionImage[],
  maxTokens = 2_048,
  fetcher: DeepSeekFetch = fetch,
  options: DeepSeekVisionRequestOptions = {},
): Promise<DeepSeekVisionJsonResult> {
  if (!images.length) throw new Error("vision_images_required")
  const controller = new AbortController()
  const startedAt = Date.now()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  const requestBody = JSON.stringify({
    model,
    messages: [
      { role: "system", content: "You are a careful visual learning assistant. Return valid JSON only and never guess illegible text." },
      { role: "user", content: [
        { type: "text", text: prompt },
        ...images.map((image) => ({ type: "image_url", image_url: { url: `data:${image.mimeType};base64,${bytesToBase64(image.bytes)}`, detail: "original" } })),
      ] },
    ],
    response_format: { type: "json_object" },
    ...(options.thinkingDisabled ? { thinking: { type: "disabled" } } : {}),
    max_tokens: maxTokens,
    stream: false,
  })
  const requestBodyBytes = new TextEncoder().encode(requestBody).byteLength
  const diagnostics = (sanitizedMessage: string, reason?: unknown, response: DeepSeekResponseDiagnostics | null = null): DeepSeekRequestDiagnostics => ({
    elapsedMs: Date.now() - startedAt,
    requestBodyBytes,
    causeCode: safeCauseCode(reason),
    sanitizedMessage,
    response,
  })
  try {
    const result = await fetcher(DEEPSEEK_CHAT_COMPLETIONS_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: requestBody,
    })
    if (!result.ok) throw new DeepSeekApiError(result.status, diagnostics("provider returned an HTTP error"))
    let payload: unknown
    try { payload = await result.json() }
    catch (reason) { throw new DeepSeekTransportError("provider_invalid_response", diagnostics("provider response was not valid JSON", reason)) }
    const responseDiagnostics = buildDeepSeekResponseDiagnostics(payload, result.status)
    const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null
    const choices = root && Array.isArray(root.choices) ? root.choices : null
    const firstChoice = choices?.[0] && typeof choices[0] === "object" && !Array.isArray(choices[0]) ? choices[0] as Record<string, unknown> : null
    const message = firstChoice?.message && typeof firstChoice.message === "object" && !Array.isArray(firstChoice.message) ? firstChoice.message as Record<string, unknown> : null
    const content = message?.content
    const finishReason = responseDiagnostics.finishReason
    if (options.detailedOutputErrors && finishReason === "length") throw new DeepSeekTransportError("provider_output_truncated", diagnostics("provider output was truncated", undefined, responseDiagnostics))
    if (options.detailedOutputErrors && finishReason === "content_filter") throw new DeepSeekTransportError("provider_content_filtered", diagnostics("provider output was content filtered", undefined, responseDiagnostics))
    if (options.detailedOutputErrors && finishReason === "insufficient_system_resource") throw new DeepSeekTransportError("provider_resource_error", diagnostics("provider reported insufficient system resources", undefined, responseDiagnostics))
    if (!root || !choices || !firstChoice || !message) throw new DeepSeekTransportError("provider_invalid_response", diagnostics("provider response shape was invalid", undefined, responseDiagnostics))
    if (typeof content !== "string" || !content.trim()) throw new DeepSeekTransportError(options.detailedOutputErrors ? "provider_empty_content" : "provider_invalid_response", diagnostics("provider response content was empty", undefined, responseDiagnostics))
    return { content, diagnostics: diagnostics("provider response accepted", undefined, responseDiagnostics) }
  } catch (reason) {
    if (reason instanceof DeepSeekApiError || reason instanceof DeepSeekTransportError) throw reason
    if (controller.signal.aborted || (reason instanceof Error && reason.name === "AbortError")) {
      throw new DeepSeekTransportError("provider_timeout", diagnostics("provider request timed out", reason))
    }
    throw new DeepSeekTransportError("provider_network_error", diagnostics("provider network request failed", reason))
  } finally { clearTimeout(timeout) }
}

export async function requestDeepSeekAnalysis(
  apiKey: string,
  model: string,
  record: LearningAnalysisRecordData,
  fetcher: DeepSeekFetch = fetch,
): Promise<NormalizedLearningAnalysis> {
  return normalizeLearningAnalysisResponse(await requestDeepSeekJson(apiKey, model, buildLearningTextAnalysisPrompt(record), 2_048, fetcher))
}
