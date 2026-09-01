import { createClient } from "npm:@supabase/supabase-js@2"

import { DEFAULT_DEEPSEEK_MODEL, DeepSeekApiError, requestDeepSeekJson } from "../analyze-learning-record/deepseek.ts"
import { buildGrammarPrompt, normalizeGrammarResponse, type GrammarData } from "./analysis.ts"

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
const columns = "id, user_id, pattern, meaning, connection, usage_note, example, example_translation, personal_note, lesson_number, analysis_status, analysis_json"
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
  const itemId = typeof input.itemId === "string" ? input.itemId : ""
  if (!/^[0-9a-f-]{36}$/i.test(itemId)) return reply(400, { code: "invalid_item_id" })
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: authError } = await admin.auth.getUser(token)
  if (authError || !userData.user?.id) return reply(401, { code: "auth_required" })
  const { data: item, error: itemError } = await admin.from("grammar_items").select(columns).eq("id", itemId).maybeSingle()
  if (itemError) return reply(500, { code: "item_load_failed" })
  if (!item) return reply(404, { code: "item_not_found" })
  if (item.user_id !== userData.user.id) return reply(403, { code: "forbidden" })
  if (input.force !== true && item.analysis_status === "completed" && item.analysis_json) return reply(200, { itemId, cached: true })
  try {
    const { error } = await admin.from("grammar_items").update({ analysis_status: "processing" }).eq("id", itemId).eq("user_id", userData.user.id)
    if (error) throw new Error("database_write_failed")
    const analysis = normalizeGrammarResponse(await requestDeepSeekJson(deepSeekKey, model, buildGrammarPrompt(item as GrammarData), 2500))
    const { error: saveError } = await admin.from("grammar_items").update({ analysis_status: "completed", analysis_json: analysis }).eq("id", itemId).eq("user_id", userData.user.id)
    if (saveError) throw new Error("database_write_failed")
    return reply(200, { itemId, cached: false })
  } catch (reason) {
    await admin.from("grammar_items").update({ analysis_status: "failed" }).eq("id", itemId).eq("user_id", userData.user.id)
    const code = reason instanceof DeepSeekApiError ? "deepseek_failed" : reason instanceof Error ? reason.message : "analysis_failed"
    console.error("[grammar analysis] failed", { itemId, code })
    return reply(502, { code })
  }
})
