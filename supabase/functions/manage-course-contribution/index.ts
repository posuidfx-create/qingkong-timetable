import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
const contributionTypes = new Set(["note", "knowledge", "resource"])
const sharedExtensions = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif", "pdf", "txt", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "mp3", "m4a", "wav", "webm", "ogg"])

function response(status: number, body: Record<string, unknown>) { return new Response(JSON.stringify(body), { status, headers: jsonHeaders }) }
function tokenOf(request: Request) { const value = request.headers.get("Authorization") ?? ""; return value.startsWith("Bearer ") ? value.slice(7).trim() : "" }
function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : "" }
function ids(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && /^[0-9a-f-]{36}$/i.test(item)).slice(0, 20) : [] }
function extension(name: string) { return name.includes(".") ? name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "bin" }

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return response(405, { code: "method_not_allowed" })
  const token = tokenOf(request); const url = Deno.env.get("SUPABASE_URL"); const anon = Deno.env.get("SUPABASE_ANON_KEY"); const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY")
  if (!token) return response(401, { code: "auth_required" })
  if (!url || !anon || !service) return response(503, { code: "backend_not_configured" })
  const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } })
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: auth, error: authError } = await admin.auth.getUser(token); const userId = auth.user?.id
  if (authError || !userId) return response(401, { code: "auth_required" })
  let body: Record<string, unknown>
  try { const value = await request.json(); body = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {} }
  catch { return response(400, { code: "invalid_request" }) }
  const action = body.action

  if (action === "unpublish") {
    const contributionId = text(body.contributionId, 36)
    const { data: contribution } = await admin.from("course_contributions").select("id, author_id").eq("id", contributionId).maybeSingle()
    if (!contribution || contribution.author_id !== userId) return response(403, { code: "forbidden" })
    const { data: assets } = await admin.from("course_contribution_assets").select("storage_path").eq("contribution_id", contributionId)
    const { error: hideError } = await admin.from("course_contributions").update({ visibility: "private", status: "deleted" }).eq("id", contributionId).eq("author_id", userId)
    if (hideError) return response(500, { code: "unpublish_failed" })
    const paths = (assets ?? []).flatMap((asset) => typeof asset.storage_path === "string" ? [asset.storage_path] : [])
    if (paths.length) { const { error } = await admin.storage.from("course-contributions").remove(paths); if (error) console.error("[course commons] shared cleanup failed", { contributionId }) }
    await admin.from("course_contribution_assets").delete().eq("contribution_id", contributionId)
    return response(200, { ok: true })
  }

  if (action !== "publish" && action !== "resync") return response(400, { code: "invalid_action" })
  let sourceRecordId = text(body.sourceRecordId, 36); let contributionId = text(body.contributionId, 36)
  if (action === "resync") {
    const { data: existing } = await admin.from("course_contributions").select("id, author_id, source_record_id").eq("id", contributionId).maybeSingle()
    if (!existing || existing.author_id !== userId || !existing.source_record_id) return response(403, { code: "forbidden" })
    sourceRecordId = existing.source_record_id
  }
  const { data: source } = await admin.from("learning_records").select("id, user_id, course_key, title, content, record_type").eq("id", sourceRecordId).eq("user_id", userId).maybeSingle()
  if (!source || typeof source.course_key !== "string" || !source.course_key.trim()) return response(400, { code: "course_required" })
  const title = action === "resync" ? text(source.title, 160) || "学习记录" : text(body.title, 160)
  const content = action === "resync" ? text(source.content, 30000) : text(body.content, 30000)
  const type = contributionTypes.has(body.type as string) ? body.type as string : "note"
  const language = text(body.language, 20) || "zh-CN"
  const hasAssetSelection = Array.isArray(body.sharedAssetIds); const sharedAssetIds = ids(body.sharedAssetIds)
  if (sharedAssetIds.length && body.confirmAssetRights !== true) return response(400, { code: "rights_required" })
  const { data: published, error: publishError } = await userClient.rpc("publish_course_contribution", { p_source_record_id: sourceRecordId, new_title: title, new_content: content, new_type: type, new_language: language })
  if (publishError || !published?.id) return response(400, { code: "publish_failed" })
  contributionId = published.id

  const copiedPaths: string[] = []
  try {
    if (action === "resync" && hasAssetSelection) {
      const { data: oldAssets } = await admin.from("course_contribution_assets").select("storage_path").eq("contribution_id", contributionId)
      const oldPaths = (oldAssets ?? []).flatMap((asset) => typeof asset.storage_path === "string" ? [asset.storage_path] : [])
      if (oldPaths.length) await admin.storage.from("course-contributions").remove(oldPaths)
      await admin.from("course_contribution_assets").delete().eq("contribution_id", contributionId)
    }
    if (sharedAssetIds.length) {
      const { data: sourceAssets, error } = await admin.from("learning_assets").select("id, user_id, record_id, original_name, mime_type, file_size, storage_bucket, storage_path").in("id", sharedAssetIds).eq("record_id", sourceRecordId).eq("user_id", userId)
      if (error || sourceAssets?.length !== sharedAssetIds.length) throw new Error("invalid_assets")
      for (const asset of sourceAssets) {
        const { data: file, error: downloadError } = await admin.storage.from(asset.storage_bucket).download(asset.storage_path)
        if (downloadError || !file) throw new Error("source_download_failed")
        const ext = extension(asset.original_name); if (!sharedExtensions.has(ext) || typeof asset.file_size !== "number" || asset.file_size < 1 || asset.file_size > 52_428_800) throw new Error("invalid_shared_file")
        const path = `course/${contributionId}/${userId}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await admin.storage.from("course-contributions").upload(path, file, { contentType: asset.mime_type, upsert: false })
        if (uploadError) throw new Error("shared_upload_failed")
        copiedPaths.push(path)
        const { error: metadataError } = await admin.from("course_contribution_assets").insert({ contribution_id: contributionId, author_id: userId, source_asset_id: asset.id, file_name: asset.original_name, mime_type: asset.mime_type, file_size: asset.file_size, storage_bucket: "course-contributions", storage_path: path })
        if (metadataError) throw new Error("shared_metadata_failed")
      }
    }
  } catch (error) {
    if (copiedPaths.length) await admin.storage.from("course-contributions").remove(copiedPaths).catch(() => undefined)
    await admin.from("course_contribution_assets").delete().eq("contribution_id", contributionId).in("storage_path", copiedPaths)
    console.error("[course commons] attachment copy failed", { contributionId, code: error instanceof Error ? error.message : "unknown" })
    return response(500, { code: "asset_copy_failed" })
  }
  const { data: assets } = await admin.from("course_contribution_assets").select("id, contribution_id, file_name, mime_type, file_size, storage_bucket, storage_path, created_at").eq("contribution_id", contributionId)
  return response(200, { contribution: { ...published, bookmark_count: 0, bookmarked: false }, assets: assets ?? [] })
})
