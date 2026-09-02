import { createClient } from "npm:@supabase/supabase-js@2"
// @ts-expect-error Deno Edge Functions require explicit TypeScript extensions.
import { DEFAULT_DEEPSEEK_MODEL, requestDeepSeekJson } from "../analyze-learning-record/deepseek.ts"

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
const cooldownMs = 15 * 60 * 1000
function response(status: number, body: Record<string, unknown>) { return new Response(JSON.stringify(body), { status, headers: jsonHeaders }) }
function tokenOf(request: Request) { const value = request.headers.get("Authorization") ?? ""; return value.startsWith("Bearer ") ? value.slice(7).trim() : "" }
function list(value: unknown) { return Array.isArray(value) && value.every((item) => typeof item === "string") ? value.slice(0, 20) : null }
function parseAnalysis(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>; const keyTopics = list(row.keyTopics); const recurringDifficulties = list(row.recurringDifficulties); const recommendedReview = list(row.recommendedReview); const recentUpdates = list(row.recentUpdates); const sourceContributionIds = list(row.sourceContributionIds)
  if (typeof row.courseSummary !== "string" || !keyTopics || !recurringDifficulties || !recommendedReview || !recentUpdates || !sourceContributionIds) return null
  return { version: 1, courseSummary: row.courseSummary.slice(0, 3000), keyTopics, recurringDifficulties, recommendedReview, recentUpdates, sourceContributionIds }
}
async function fingerprint(value: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("") }

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return response(405, { code: "method_not_allowed" })
  const token = tokenOf(request); const url = Deno.env.get("SUPABASE_URL"); const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY"); const key = Deno.env.get("DEEPSEEK_API_KEY"); const model = Deno.env.get("DEEPSEEK_MODEL") ?? DEFAULT_DEEPSEEK_MODEL
  if (!token) return response(401, { code: "auth_required" })
  if (!url || !service || !key) return response(503, { code: "backend_not_configured" })
  let body: Record<string, unknown>; try { const value = await request.json(); body = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {} } catch { return response(400, { code: "invalid_request" }) }
  const courseKey = typeof body.courseKey === "string" ? body.courseKey.trim().slice(0, 160) : ""
  if (!courseKey) return response(400, { code: "course_required" })
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: auth, error: authError } = await admin.auth.getUser(token)
  if (authError || !auth.user?.id) return response(401, { code: "auth_required" })
  const { data: rows, error: loadError } = await admin.from("course_contributions").select("id, title, content, ai_summary, ai_key_points, ai_suggested_review, updated_at").eq("course_key", courseKey).eq("visibility", "course").eq("status", "published").order("updated_at").limit(200)
  if (loadError) return response(500, { code: "load_failed" })
  if (!rows?.length) return response(400, { code: "no_public_content" })
  const sourceFingerprint = await fingerprint(JSON.stringify(rows.map((row) => ({ id: row.id, updated_at: row.updated_at })))); const source = JSON.stringify(rows.map((row) => ({ id: row.id, title: row.title, content: typeof row.content === "string" ? row.content.slice(0, 4000) : "", ai_summary: row.ai_summary, ai_key_points: Array.isArray(row.ai_key_points) ? row.ai_key_points.slice(0, 30) : [], ai_suggested_review: row.ai_suggested_review, updated_at: row.updated_at })))
  const { data: cached } = await admin.from("course_commons_analyses").select("analysis_json, source_fingerprint, processing_status, updated_at").eq("course_key", courseKey).maybeSingle()
  if (cached?.processing_status === "completed" && cached.source_fingerprint === sourceFingerprint && cached.analysis_json) return response(200, { analysis: cached.analysis_json, cached: true })
  if (cached?.updated_at && Date.now() - new Date(cached.updated_at).getTime() < cooldownMs) return response(429, { code: "analysis_cooldown" })
  await admin.from("course_commons_analyses").upsert({ course_key: courseKey, processing_status: "processing", source_fingerprint: sourceFingerprint, updated_at: new Date().toISOString() })
  try {
    const prompt = `请只根据以下已经公开的课程内容，生成课程公共知识整理。不要推测未提供的信息。返回严格 JSON：{"courseSummary":"","keyTopics":[],"recurringDifficulties":[],"recommendedReview":[],"recentUpdates":[],"sourceContributionIds":[]}。每个数组使用简洁字符串，sourceContributionIds 只能取输入中的 id。\n公开内容：${source}`
    const raw = await requestDeepSeekJson(key, model, prompt, 2500); let decoded: unknown; try { decoded = JSON.parse(raw) } catch { throw new Error("invalid_ai_response") }
    const analysis = parseAnalysis(decoded); if (!analysis) throw new Error("invalid_ai_response")
    const validIds = new Set(rows.map((row) => row.id)); analysis.sourceContributionIds = analysis.sourceContributionIds.filter((id) => validIds.has(id))
    const { error } = await admin.from("course_commons_analyses").update({ analysis_json: analysis, processing_status: "completed", source_fingerprint: sourceFingerprint, updated_at: new Date().toISOString() }).eq("course_key", courseKey)
    if (error) throw new Error("database_write_failed")
    return response(200, { analysis, cached: false })
  } catch (reason) {
    await admin.from("course_commons_analyses").update({ processing_status: "failed", updated_at: new Date().toISOString() }).eq("course_key", courseKey)
    console.error("[course commons analysis] failed", { courseKey, code: reason instanceof Error ? reason.message : "unknown" })
    return response(500, { code: "analysis_failed" })
  }
})
