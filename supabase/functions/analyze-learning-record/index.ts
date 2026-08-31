import { createClient } from "npm:@supabase/supabase-js@2"

import {
  assertAnalyzableAssetSize,
  buildLearningAnalysisPrompt,
  chooseGeminiAttachmentTransfer,
  getLearningAssetAnalysisKind,
  learningAnalysisResponseSchema,
  normalizeGeminiAnalysisResponse,
  runIndependentAssetJobs,
  selectAnalyzableAssets,
  type LearningAnalysisAssetData,
  type LearningAnalysisRecordData,
} from "./analysis.ts"
import { deleteGeminiFile, GeminiFileApiError, uploadGeminiFile, withGeminiUploadedFile } from "./geminiFiles.ts"

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
const recordColumns = "id, user_id, record_date, title, course_name, content, mood_note"
const assetColumns = "id, record_id, user_id, asset_type, original_name, mime_type, file_size, storage_bucket, storage_path"

type AnalysisErrorCode = "storage_not_found" | "file_too_large" | "unsupported_file" | "gemini_auth_failed" | "gemini_quota" | "gemini_timeout" | "invalid_ai_response" | "gemini_failed" | "database_write_failed"

interface AssetResult { assetId: string; status: "completed" | "failed" | "unsupported"; errorCode?: AnalysisErrorCode }

function response(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization") ?? ""
  return header.startsWith("Bearer ") ? header.slice(7).trim() || null : null
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  return btoa(binary)
}

function mapGeminiStatus(status: number): AnalysisErrorCode {
  if (status === 401 || status === 403) return "gemini_auth_failed"
  if (status === 429) return "gemini_quota"
  return "gemini_failed"
}

function errorCode(reason: unknown): AnalysisErrorCode {
  if (reason instanceof GeminiFileApiError) return reason.status === null ? "gemini_failed" : mapGeminiStatus(reason.status)
  if (reason instanceof Error) {
    if (reason.name === "AbortError") return "gemini_timeout"
    if (["storage_not_found", "file_too_large", "unsupported_file", "gemini_auth_failed", "gemini_quota", "gemini_timeout", "invalid_ai_response", "gemini_failed", "database_write_failed"].includes(reason.message)) return reason.message as AnalysisErrorCode
  }
  return "gemini_failed"
}

type GeminiMediaInput = { type: "image" | "document"; data: string; mime_type: string } | { type: "image" | "document"; uri: string; mime_type: string }

async function requestGeminiInteraction(apiKey: string, model: string, record: LearningAnalysisRecordData, asset: LearningAnalysisAssetData, media: GeminiMediaInput): Promise<ReturnType<typeof normalizeGeminiAnalysisResponse>> {
  const kind = getLearningAssetAnalysisKind(asset)
  if (!kind) throw new Error("unsupported_file")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  try {
    const geminiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model,
        input: [
          { type: "text", text: buildLearningAnalysisPrompt(record, asset) },
          media,
        ],
        response_format: { type: "text", mime_type: "application/json", schema: learningAnalysisResponseSchema },
      }),
    })
    if (!geminiResponse.ok) throw new Error(mapGeminiStatus(geminiResponse.status))
    const payload: unknown = await geminiResponse.json()
    const outputText = payload && typeof payload === "object" && "output_text" in payload ? (payload as { output_text?: unknown }).output_text : null
    return normalizeGeminiAnalysisResponse(outputText)
  } finally {
    clearTimeout(timeout)
  }
}

async function requestGemini(apiKey: string, model: string, record: LearningAnalysisRecordData, asset: LearningAnalysisAssetData, bytes: Uint8Array): Promise<ReturnType<typeof normalizeGeminiAnalysisResponse>> {
  const kind = getLearningAssetAnalysisKind(asset)
  if (!kind) throw new Error("unsupported_file")
  const type = kind === "image" ? "image" : "document"
  const mimeType = asset.mime_type.toLowerCase().split(";")[0]?.trim() ?? ""
  if (chooseGeminiAttachmentTransfer(bytes.byteLength) === "inline") return requestGeminiInteraction(apiKey, model, record, asset, { type, data: bytesToBase64(bytes), mime_type: mimeType })

  return withGeminiUploadedFile({
    upload: () => uploadGeminiFile(apiKey, asset.original_name, mimeType, bytes),
    use: (file) => requestGeminiInteraction(apiKey, model, record, asset, { type, uri: file.uri, mime_type: file.mimeType }),
    cleanup: (file) => deleteGeminiFile(apiKey, file),
    onCleanupError: () => console.warn("[learning analysis] Gemini temporary file cleanup failed"),
  })
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return response(405, { code: "method_not_allowed" })

  const token = bearerToken(request)
  if (!token) return response(401, { code: "auth_required" })
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY")
  const geminiKey = Deno.env.get("GEMINI_API_KEY")
  const geminiModel = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash"
  if (!supabaseUrl || !serviceKey) return response(503, { code: "backend_not_configured" })
  if (!geminiKey) return response(503, { code: "gemini_not_configured" })

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
  const supportedAssets = selectAnalyzableAssets(assets)
  const supportedIds = new Set(supportedAssets.map((asset) => asset.id))
  const results: AssetResult[] = assets.filter((asset) => !supportedIds.has(asset.id)).map((asset) => ({ assetId: asset.id, status: "unsupported" }))

  results.push(...await runIndependentAssetJobs(supportedAssets, async (asset): Promise<AssetResult> => {
      const { error: processingError } = await admin.from("learning_assets").update({ processing_status: "processing", extracted_text: null, analysis_json: null }).eq("id", asset.id).eq("record_id", recordId).eq("user_id", userData.user.id)
      if (processingError) throw new Error("database_write_failed")
      assertAnalyzableAssetSize(asset)
      const { data: file, error: downloadError } = await admin.storage.from(asset.storage_bucket).download(asset.storage_path)
      if (downloadError || !file) throw new Error("storage_not_found")
      if (file.size !== asset.file_size) throw new Error("storage_not_found")
      const normalized = await requestGemini(geminiKey, geminiModel, record as LearningAnalysisRecordData, asset, new Uint8Array(await file.arrayBuffer()))
      const { error: updateError } = await admin.from("learning_assets").update({ processing_status: "completed", extracted_text: normalized.extractedText || null, analysis_json: normalized.analysis }).eq("id", asset.id).eq("record_id", recordId).eq("user_id", userData.user.id)
      if (updateError) throw new Error("database_write_failed")
      return { assetId: asset.id, status: "completed" }
    }, async (asset, reason): Promise<AssetResult> => {
      const code = errorCode(reason)
      const { error: failedUpdateError } = await admin.from("learning_assets").update({ processing_status: "failed", extracted_text: null, analysis_json: null }).eq("id", asset.id).eq("record_id", recordId).eq("user_id", userData.user.id)
      const finalCode = failedUpdateError ? "database_write_failed" : code
      console.error("[learning analysis] asset failed", { assetId: asset.id, code: finalCode })
      return { assetId: asset.id, status: "failed", errorCode: finalCode }
    }))

  return response(200, {
    recordId,
    results,
    completed: results.filter((item) => item.status === "completed").length,
    failed: results.filter((item) => item.status === "failed").length,
    unsupported: results.filter((item) => item.status === "unsupported").length,
  })
})
