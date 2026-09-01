import { createClient } from "npm:@supabase/supabase-js@2"

import { DEFAULT_DEEPSEEK_MODEL, DeepSeekApiError, requestDeepSeekJson } from "../analyze-learning-record/deepseek.ts"
import { buildLessonPrompt, normalizeLessonResponse } from "./analysis.ts"

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: jsonHeaders })
const tokenFrom = (request: Request) => { const value = request.headers.get("Authorization") ?? ""; return value.startsWith("Bearer ") ? value.slice(7).trim() || null : null }

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return reply(405, { code: "method_not_allowed" })
  const token = tokenFrom(request)
  if (!token) return reply(401, { code: "auth_required" })
  const url = Deno.env.get("SUPABASE_URL")
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY")
  const deepSeekKey = Deno.env.get("DEEPSEEK_API_KEY")
  const model = Deno.env.get("DEEPSEEK_MODEL") ?? DEFAULT_DEEPSEEK_MODEL
  if (!url || !key) return reply(503, { code: "backend_not_configured" })
  if (!deepSeekKey) return reply(503, { code: "deepseek_not_configured" })
  let input: Record<string, unknown>
  try { const value: unknown = await request.json(); input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {} } catch { return reply(400, { code: "invalid_request" }) }
  const lessonNumber = input.lessonNumber
  if (typeof lessonNumber !== "number" || !Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > 50) return reply(400, { code: "invalid_lesson" })
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: authError } = await admin.auth.getUser(token)
  if (authError || !userData.user?.id) return reply(401, { code: "auth_required" })
  const userId = userData.user.id
  const volume = lessonNumber <= 25 ? "beginner_1" : "beginner_2"
  const { data: cached } = await admin.from("vocabulary_lesson_analyses").select("id, analysis_status, analysis_json").eq("user_id", userId).eq("textbook_key", "minna_no_nihongo").eq("lesson_number", lessonNumber).maybeSingle()
  if (input.force !== true && cached?.analysis_status === "completed" && cached.analysis_json) return reply(200, { lessonNumber, cached: true })
  const [{ data: words, error: wordsError }, { data: grammar, error: grammarError }] = await Promise.all([
    admin.from("vocabulary_words").select("term, reading, meaning, notes, analysis_json").eq("user_id", userId).eq("textbook_key", "minna_no_nihongo").eq("lesson_number", lessonNumber),
    admin.from("grammar_items").select("pattern, meaning, connection, usage_note, personal_note, analysis_json").eq("user_id", userId).eq("textbook_key", "minna_no_nihongo").eq("lesson_number", lessonNumber),
  ])
  if (wordsError || grammarError) return reply(500, { code: "lesson_load_failed" })
  if (!(words?.length || grammar?.length)) return reply(422, { code: "lesson_empty" })
  const id = cached?.id ?? crypto.randomUUID()
  const { error: processingError } = await admin.from("vocabulary_lesson_analyses").upsert({ id, user_id: userId, textbook_key: "minna_no_nihongo", volume, lesson_number: lessonNumber, analysis_status: "processing", analysis_json: cached?.analysis_json ?? null }, { onConflict: "user_id,textbook_key,lesson_number" })
  if (processingError) return reply(500, { code: "database_write_failed" })
  try {
    const analysis = normalizeLessonResponse(await requestDeepSeekJson(deepSeekKey, model, buildLessonPrompt(lessonNumber, words ?? [], grammar ?? []), 3500))
    const { error } = await admin.from("vocabulary_lesson_analyses").update({ analysis_status: "completed", analysis_json: analysis }).eq("id", id).eq("user_id", userId)
    if (error) throw new Error("database_write_failed")
    return reply(200, { lessonNumber, cached: false })
  } catch (reason) {
    await admin.from("vocabulary_lesson_analyses").update({ analysis_status: "failed" }).eq("id", id).eq("user_id", userId)
    const code = reason instanceof DeepSeekApiError ? "deepseek_failed" : reason instanceof Error ? reason.message : "analysis_failed"
    console.error("[lesson analysis] failed", { lessonNumber, code })
    return reply(502, { code })
  }
})
