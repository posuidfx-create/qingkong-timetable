import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

const edgeSource = readFileSync(new URL("../../supabase/functions/analyze-learning-record/index.ts", import.meta.url), "utf8")
const filesSource = readFileSync(new URL("../../supabase/functions/analyze-learning-record/geminiFiles.ts", import.meta.url), "utf8")

describe("Phase 24B Edge Function security contract", () => {
  it("keeps Gemini credentials server-only and verifies the bearer user", () => {
    expect(edgeSource).toContain('Deno.env.get("GEMINI_API_KEY")')
    expect(edgeSource).not.toContain("VITE_GEMINI")
    expect(edgeSource).toContain("bearerToken(request)")
    expect(edgeSource).toContain("admin.auth.getUser(token)")
    expect(edgeSource).toContain("record.user_id !== userData.user.id")
    expect(edgeSource).toContain('Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash"')
    expect(edgeSource).not.toContain("body.model")
  })

  it("answers browser preflight with the headers required by supabase.functions.invoke", () => {
    expect(edgeSource).toContain('request.method === "OPTIONS"')
    expect(edgeSource).toContain('"Access-Control-Allow-Origin": "*"')
    for (const header of ["authorization", "x-client-info", "apikey", "content-type"]) expect(edgeSource).toContain(header)
  })

  it("resolves private Storage metadata on the server and never accepts paths from the request", () => {
    expect(edgeSource).toContain('admin.from("learning_assets")')
    expect(edgeSource).toContain("admin.storage.from(asset.storage_bucket).download(asset.storage_path)")
    expect(edgeSource).not.toContain("createPublicUrl")
    expect(edgeSource).not.toContain("createSignedUrl")
  })

  it("writes only the existing service-managed AI columns through the server client", () => {
    expect(edgeSource).toContain('processing_status: "processing"')
    expect(edgeSource).toContain('processing_status: "completed"')
    expect(edgeSource).toContain('processing_status: "failed"')
    expect(edgeSource).toContain("extracted_text: normalized.extractedText")
    expect(edgeSource).toContain("analysis_json: normalized.analysis")
  })

  it("does not delete original attachments when analysis fails", () => {
    expect(edgeSource).not.toContain(".remove(")
    expect(edgeSource).not.toContain(".delete().eq(\"id\", asset.id)")
  })

  it("uses Gemini Files API for large payloads and always attempts temporary-file cleanup", () => {
    expect(edgeSource).toContain("chooseGeminiAttachmentTransfer(bytes.byteLength)")
    expect(edgeSource).toContain("uploadGeminiFile(")
    expect(edgeSource).toContain("deleteGeminiFile(")
    expect(edgeSource).toContain("withGeminiUploadedFile({")
    expect(filesSource).toContain("finally")
    expect(filesSource).toContain("await operations.cleanup(uploaded)")
  })

  it("recovers each supported asset independently and attempts to clear permanent processing state", () => {
    expect(edgeSource).toContain("runIndependentAssetJobs(supportedAssets")
    expect(edgeSource).toContain('processing_status: "failed"')
    expect(edgeSource).toContain('status: "unsupported"')
    expect(edgeSource).toContain('finalCode = failedUpdateError ? "database_write_failed" : code')
  })
})
