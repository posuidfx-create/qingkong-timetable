import { createClient } from "npm:@supabase/supabase-js@2"

import {
  hasAnalyzableRecordText,
  mergeLearningAnalyses,
  type LearningAnalysisAssetData,
  type LearningAnalysisRecordData,
  type NormalizedLearningAnalysis,
} from "./analysis.ts"
import { DEFAULT_DEEPSEEK_MODEL, DEFAULT_DEEPSEEK_VISION_MODEL, DeepSeekApiError, requestDeepSeekAnalysis, requestDeepSeekVisionAnalysis } from "./deepseek.ts"

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
const recordColumns = "id, user_id, record_date, title, course_name, content, mood_note, processing_status, analysis_json"
const assetColumns = "id, record_id, user_id, asset_type, original_name, mime_type, file_size, storage_bucket, storage_path"

type AnalysisErrorCode = "unsupported_file" | "deepseek_auth_failed" | "deepseek_quota" | "deepseek_timeout" | "invalid_ai_response" | "deepseek_failed"
interface AssetResult { assetId: string; status: "completed" | "failed" | "unsupported"; analysis_json?: NormalizedLearningAnalysis["analysis"]; errorCode?: AnalysisErrorCode }
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

const supportedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const maxVisionImageBytes = 15 * 1024 * 1024

function detectedImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png"
  if (bytes.length >= 6 && new TextDecoder().decode(bytes.subarray(0, 6)).match(/^GIF8[79]a$/)) return "image/gif"
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP") return "image/webp"
  return null
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
  const deepSeekVisionModel = Deno.env.get("DEEPSEEK_VISION_MODEL") ?? DEFAULT_DEEPSEEK_VISION_MODEL
  if (!supabaseUrl || !serviceKey) return response(503, { code: "backend_not_configured" })
  if (!deepSeekKey) return response(503, { code: "deepseek_not_configured" })

  let body: unknown
  try { body = await request.json() }
  catch { return response(400, { code: "invalid_request" }) }
  const recordId = body && typeof body === "object" && !Array.isArray(body) && typeof (body as { recordId?: unknown }).recordId === "string" ? (body as { recordId: string }).recordId.trim() : ""
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(recordId)) return response(400, { code: "invalid_record_id" })
  const requestedAssetId = body && typeof body === "object" && !Array.isArray(body) && typeof (body as { assetId?: unknown }).assetId === "string" ? (body as { assetId: string }).assetId.trim() : null
  if (requestedAssetId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedAssetId)) return response(400, { code: "invalid_asset_id" })

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
  const targetAssets = requestedAssetId ? assets.filter((asset) => asset.id === requestedAssetId) : assets
  if (requestedAssetId && !targetAssets.length) return response(404, { code: "asset_not_found" })
  if (targetAssets.some((asset) => asset.user_id !== userData.user.id)) return response(403, { code: "forbidden" })
  const recordData = record as LearningAnalysisRecordData
  const analyzableAssets = targetAssets.filter((asset) => asset.asset_type === "image" && supportedImageMimeTypes.has(asset.mime_type.toLowerCase().split(";")[0].trim())).slice(0, 6)
  const includeRecordText = requestedAssetId === null && hasAnalyzableRecordText(recordData)
  const shouldAnalyze = includeRecordText || analyzableAssets.length > 0
  if (!shouldAnalyze) return response(200, { recordId, model: deepSeekModel, visionModel: deepSeekVisionModel, recordAnalysis: { status: "unsupported", errorCode: "unsupported_file" }, results: targetAssets.map((asset) => ({ assetId: asset.id, status: "unsupported" })), completed: 0, failed: 0, unsupported: targetAssets.length + 1 })

  const { error: recordProcessingError } = await admin.from("learning_records").update({ processing_status: "processing", analysis_json: null }).eq("id", recordId).eq("user_id", userData.user.id)
  if (recordProcessingError) return response(500, { code: "database_write_failed" })
  const normalizedResults: NormalizedLearningAnalysis[] = []
  let textFailure: AnalysisErrorCode | null = null
  if (includeRecordText) {
    try { normalizedResults.push(await requestDeepSeekAnalysis(deepSeekKey, deepSeekModel, recordData)) }
    catch (reason) { textFailure = errorCode(reason); console.error("[learning analysis] text failed", { recordId, code: textFailure }) }
  }

  const resultMap = new Map<string, AssetResult>(targetAssets.map((asset) => [asset.id, { assetId: asset.id, status: "unsupported" }]))
  const analyzeAsset = async (asset: LearningAnalysisAssetData): Promise<void> => {
    const mime = asset.mime_type.toLowerCase().split(";")[0].trim()
    try {
      const { error: processingError } = await admin.from("learning_assets").update({ processing_status: "processing", extracted_text: null, analysis_json: null }).eq("id", asset.id).eq("user_id", userData.user.id)
      if (processingError) throw new Error("database_write_failed")
      const { data: blob, error: downloadError } = await admin.storage.from(asset.storage_bucket).download(asset.storage_path)
      if (downloadError || !blob) throw new Error("deepseek_failed")
      if (blob.size < 1 || blob.size > maxVisionImageBytes || blob.size !== asset.file_size) throw new Error("unsupported_file")
      const bytes = new Uint8Array(await blob.arrayBuffer())
      if (detectedImageMime(bytes) !== mime) throw new Error("unsupported_file")
      const normalized = await requestDeepSeekVisionAnalysis(deepSeekKey, deepSeekVisionModel, recordData, asset.original_name, mime, bytes)
      const { error: completeError } = await admin.from("learning_assets").update({ processing_status: "completed", extracted_text: normalized.extractedText || null, analysis_json: normalized.analysis }).eq("id", asset.id).eq("user_id", userData.user.id)
      if (completeError) throw new Error("database_write_failed")
      normalizedResults.push(normalized)
      resultMap.set(asset.id, { assetId: asset.id, status: "completed", analysis_json: normalized.analysis })
    } catch (reason) {
      const code = reason instanceof Error && reason.message === "unsupported_file" ? "unsupported_file" : errorCode(reason)
      const { error: failedError } = await admin.from("learning_assets").update({ processing_status: "failed", extracted_text: null, analysis_json: null }).eq("id", asset.id).eq("user_id", userData.user.id)
      console.error("[learning analysis] asset failed", { recordId, assetId: asset.id, code })
      resultMap.set(asset.id, { assetId: asset.id, status: "failed", errorCode: failedError ? "deepseek_failed" : code })
    }
  }
  for (let index = 0; index < analyzableAssets.length; index += 2) await Promise.all(analyzableAssets.slice(index, index + 2).map(analyzeAsset))

  const merged = mergeLearningAnalyses(normalizedResults)
  let recordAnalysis: RecordAnalysisResult
  if (merged) {
    const { error: completedError } = await admin.from("learning_records").update({ processing_status: "completed", analysis_json: merged.analysis }).eq("id", recordId).eq("user_id", userData.user.id)
    if (completedError) {
      await admin.from("learning_records").update({ processing_status: "failed", analysis_json: null }).eq("id", recordId).eq("user_id", userData.user.id)
      recordAnalysis = { status: "failed", errorCode: "deepseek_failed" }
    } else recordAnalysis = { status: "completed", analysis_json: merged.analysis }
  } else {
    const code = textFailure ?? "deepseek_failed"
    await admin.from("learning_records").update({ processing_status: "failed", analysis_json: null }).eq("id", recordId).eq("user_id", userData.user.id)
    recordAnalysis = { status: "failed", errorCode: code }
  }
  const results = targetAssets.map((asset) => resultMap.get(asset.id)!)

  return response(200, {
    recordId,
    model: deepSeekModel,
    visionModel: deepSeekVisionModel,
    recordAnalysis,
    results,
    completed: results.filter((item) => item.status === "completed").length + (recordAnalysis.status === "completed" ? 1 : 0),
    failed: results.filter((item) => item.status === "failed").length + (recordAnalysis.status === "failed" ? 1 : 0),
    unsupported: results.filter((item) => item.status === "unsupported").length,
  })
})
