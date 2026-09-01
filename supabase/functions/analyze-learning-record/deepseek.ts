// @ts-expect-error Deno Edge Functions require explicit TypeScript extensions.
import { buildLearningTextAnalysisPrompt, normalizeLearningAnalysisResponse, type LearningAnalysisRecordData, type NormalizedLearningAnalysis } from "./analysis.ts"

export const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash"
export const DEEPSEEK_CHAT_COMPLETIONS_URL = "https://api.deepseek.com/chat/completions"

export class DeepSeekApiError extends Error {
  constructor(public readonly status: number | null) { super("deepseek_failed") }
}

export type DeepSeekFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

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

export async function requestDeepSeekAnalysis(
  apiKey: string,
  model: string,
  record: LearningAnalysisRecordData,
  fetcher: DeepSeekFetch = fetch,
): Promise<NormalizedLearningAnalysis> {
  return normalizeLearningAnalysisResponse(await requestDeepSeekJson(apiKey, model, buildLearningTextAnalysisPrompt(record), 2_048, fetcher))
}
