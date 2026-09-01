import { createClient } from "npm:@supabase/supabase-js@2"

import {
  hasAnalyzableRecordText,
  type LearningAnalysisAssetData,
  type LearningAnalysisRecordData,
  type NormalizedLearningAnalysis,
} from "./analysis.ts"
import { DEFAULT_DEEPSEEK_MODEL, DeepSeekApiError, requestDeepSeekAnalysis } from "./deepseek.ts"

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
const recordColumns = "id, user_id, record_date, title, course_name, content, mood_note, processing_status, analysis_json"
const assetColumns = "id, record_id, user_id, asset_type, original_name, mime_type, file_size, storage_bucket, storage_path"

type AnalysisErrorCode = "unsupported_file" | "deepseek_auth_failed" | "deepseek_quota" | "deepseek_timeout" | "invalid_ai_response" | "deepseek_failed"
interface AssetResult { assetId: string; status: "unsupported" }
interface RecordAnalysisResult {
  status: "completed" | "failed" | "unsupported"
  analysis_json?: NormalizedLearningAnalysis["analysis"]
  errorCode?: AnalysisErrorCode
}

function response(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization") ?? ""
  return header.startsWith("Bearer ") ? header.slice(7).trim() || null : null
}

function mapDeepSeekStatus(status: number): AnalysisErrorCode {
  if (status === 401 || status === 403) return "deepseek_auth_failed"
  if (status === 429) return "deepseek_quota"
  return "deepseek_failed"
}

function errorCode(reason: unknown): AnalysisErrorCode {
  if (reason instanceof DeepSeekApiError) return reason.status === null ? "deepseek_failed" : mapDeepSeekStatus(reason.status)
  if (reason instanceof Error) {
    if (reason.name === "AbortError") return "deepseek_timeout"
    if (["deepseek_auth_failed", "deepseek_quota", "deepseek_timeout", "invalid_ai_response", "deepseek_failed"].includes(reason.message)) return reason.message as AnalysisErrorCode
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
  const deepSeekKey = Deno.env.get("DEEPSEEK_API_KEY")
  const deepSeekModel = Deno.env.get("DEEPSEEK_MODEL") ?? DEFAULT_DEEPSEEK_MODEL
  if (!supabaseUrl || !serviceKey) return response(503, { code: "backend_not_configured" })
  if (!deepSeekKey) return response(503, { code: "deepseek_not_configured" })

  let body: unknown
  try { body = await request.json() }
  catch { return response(400, { code: "invalid_request" }) }
  const recordId = body && typeof body === "object" && !Array.isArray(body) && typeof (body as { recordId?: unknown }).recordId === "string" ? (body as { recordId: string }).recordId.trim() : ""
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(recordId)) return response(400, { code: "invalid_record_id" })

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user?.id) return response(401, { code: "auth_required" })

  const { data: record, error: recordError } = await admin.from("learning_records").select(recordColumns).eq("id", recordId).maybeSingle()
  if (recordError) return response(500, { code: "record_load_failed" })
  if (!record) return response(404, { code: "record_not_found" })
  if (record.user_id !== userData.user.id) return response(403, { code: "forbidden" })

  const { data: assetRows, error: assetError } = await admin.from("learning_assets").select(assetColumns).eq("record_id", recordId).order("sort_order")
  if (assetError) return response(500, { code: "asset_load_failed" })
  const assets = (assetRows ?? []) as LearningAnalysisAssetData[]
  const results: AssetResult[] = assets.map((asset) => ({ assetId: asset.id, status: "unsupported" }))
  const recordData = record as LearningAnalysisRecordData

  let recordAnalysis: RecordAnalysisResult
  if (!hasAnalyzableRecordText(recordData)) {
    recordAnalysis = { status: "unsupported", errorCode: "unsupported_file" }
  } else {
    try {
      const { error: processingError } = await admin.from("learning_records").update({ processing_status: "processing", analysis_json: null }).eq("id", recordId).eq("user_id", userData.user.id)
      if (processingError) return response(500, { code: "database_write_failed" })
      const normalized = await requestDeepSeekAnalysis(deepSeekKey, deepSeekModel, recordData)
      const { error: completedError } = await admin.from("learning_records").update({ processing_status: "completed", analysis_json: normalized.analysis }).eq("id", recordId).eq("user_id", userData.user.id)
      if (completedError) throw new Error("database_write_failed")
      recordAnalysis = { status: "completed", analysis_json: normalized.analysis }
    } catch (reason) {
      const code = errorCode(reason)
      const { error: failedError } = await admin.from("learning_records").update({ processing_status: "failed", analysis_json: null }).eq("id", recordId).eq("user_id", userData.user.id)
      console.error("[learning analysis] record failed", { recordId, code })
      recordAnalysis = { status: "failed", errorCode: failedError ? "deepseek_failed" : code }
    }
  }

  return response(200, {
    recordId,
    model: deepSeekModel,
    recordAnalysis,
    results,
    completed: recordAnalysis.status === "completed" ? 1 : 0,
    failed: recordAnalysis.status === "failed" ? 1 : 0,
    unsupported: results.length + (recordAnalysis.status === "unsupported" ? 1 : 0),
  })
})
