import { createClient } from "npm:@supabase/supabase-js@2"

import { buildVocabularyAnalysisPrompt, normalizeVocabularyAnalysisResponse, type VocabularyWordData } from "./analysis.ts"
import { DEFAULT_DEEPSEEK_MODEL, DeepSeekApiError, requestDeepSeekJson } from "../analyze-learning-record/deepseek.ts"

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
const wordColumns = "id, user_id, term, language, reading, meaning, notes, course_name, textbook_key, volume, lesson_number, analysis_status, analysis_json"

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization") ?? ""
  return header.startsWith("Bearer ") ? header.slice(7).trim() || null : null
}

function errorCode(reason: unknown): string {
  if (reason instanceof DeepSeekApiError) {
    if (reason.status === 401 || reason.status === 403) return "deepseek_auth_failed"
    if (reason.status === 429) return "deepseek_quota"
    return "deepseek_failed"
  }
  if (reason instanceof Error) {
    if (reason.name === "AbortError") return "deepseek_timeout"
    if (reason.message === "invalid_ai_response") return reason.message
  }
  return "deepseek_failed"
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return response(405, { code: "method_not_allowed" })
  const token = bearerToken(request)
  if (!token) return response(401, { code: "auth_required" })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY")
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY")
  const model = Deno.env.get("DEEPSEEK_MODEL") ?? DEFAULT_DEEPSEEK_MODEL
  if (!supabaseUrl || !serviceKey) return response(503, { code: "backend_not_configured" })
  if (!apiKey) return response(503, { code: "deepseek_not_configured" })

  let body: unknown
  try { body = await request.json() } catch { return response(400, { code: "invalid_request" }) }
  const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {}
  const wordId = typeof input.wordId === "string" ? input.wordId.trim() : ""
  const force = input.force === true
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(wordId)) return response(400, { code: "invalid_word_id" })

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user?.id) return response(401, { code: "auth_required" })
  const { data: word, error: wordError } = await admin.from("vocabulary_words").select(wordColumns).eq("id", wordId).maybeSingle()
  if (wordError) return response(500, { code: "word_load_failed" })
  if (!word) return response(404, { code: "word_not_found" })
  if (word.user_id !== userData.user.id) return response(403, { code: "forbidden" })
  if (!force && word.analysis_status === "completed" && word.analysis_json) return response(200, { wordId, model, cached: true, status: "completed" })

  try {
    const { error: processingError } = await admin.from("vocabulary_words").update({ analysis_status: "processing" }).eq("id", wordId).eq("user_id", userData.user.id)
    if (processingError) return response(500, { code: "database_write_failed" })
    const content = await requestDeepSeekJson(apiKey, model, buildVocabularyAnalysisPrompt(word as VocabularyWordData), 2_500)
    const analysis = normalizeVocabularyAnalysisResponse(content)
    const { error: completedError } = await admin.from("vocabulary_words").update({ analysis_status: "completed", analysis_json: analysis }).eq("id", wordId).eq("user_id", userData.user.id)
    if (completedError) throw new Error("database_write_failed")
    return response(200, { wordId, model, cached: false, status: "completed" })
  } catch (reason) {
    const code = errorCode(reason)
    const { error: failedError } = await admin.from("vocabulary_words").update({ analysis_status: "failed" }).eq("id", wordId).eq("user_id", userData.user.id)
    console.error("[vocabulary analysis] failed", { wordId, code })
    return response(failedError ? 500 : 502, { code: failedError ? "database_write_failed" : code })
  }
})
