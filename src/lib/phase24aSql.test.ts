import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

const sql = readFileSync(new URL("../../supabase/phase24a-learning-records.sql", import.meta.url), "utf8")

describe("Phase 24A learning SQL security contract", () => {
  it("allows attachment-only records by omitting the old body constraint", () => {
    expect(sql).not.toContain("learning_records_body")
  })

  it("prevents authenticated clients from setting or changing AI processing results", () => {
    expect(sql).toContain("auth.role() = 'authenticated'")
    expect(sql).toContain("new.processing_status <> 'uploaded'")
    expect(sql).toContain("new.extracted_text is not null")
    expect(sql).toContain("new.analysis_json is not null")
    expect(sql).toContain("new.extracted_text is distinct from old.extracted_text")
    expect(sql).toContain("new.analysis_json is distinct from old.analysis_json")
    expect(sql).toContain("grant update (processing_status, extracted_text, analysis_json) on public.learning_assets to service_role")
  })

  it("does not grant authenticated INSERT or UPDATE access to AI-managed columns", () => {
    const authenticatedInsert = sql.match(/grant insert \(([^)]+)\) on public\.learning_assets to authenticated;/)?.[1] ?? ""
    const authenticatedUpdate = sql.match(/grant update \(([^)]+)\) on public\.learning_assets to authenticated;/)?.[1] ?? ""
    expect(authenticatedInsert).not.toMatch(/processing_status|extracted_text|analysis_json/)
    expect(authenticatedUpdate).not.toMatch(/processing_status|extracted_text|analysis_json/)
  })

  it("rejects missing Storage objects and mismatched server-side sizes", () => {
    expect(sql).toContain("from storage.objects object_row")
    expect(sql).toContain("object_row.bucket_id = new.storage_bucket")
    expect(sql).toContain("object_row.name = new.storage_path")
    expect(sql).toContain("actual_file_size <> new.file_size")
    expect(sql).toContain("Storage object does not exist")
  })

  it("keeps the transactional migration, extension allowlist, private RLS, and concurrent attachment guard", () => {
    expect(sql.trimStart().includes("begin;")).toBe(true)
    expect(sql.trimEnd().endsWith("commit;")).toBe(true)
    expect(sql).toContain("pg_advisory_xact_lock")
    expect(sql).toContain(">= 20")
    expect(sql).toContain("user_id = auth.uid()")
    expect(sql).toContain("public.can_upload_learning_material(name, bucket_id)")
  })

  it("uses official per-bucket hard limits for images, documents, and audio", () => {
    expect(sql).toContain("('learning-materials-images', 'learning-materials-images', false, 15728640)")
    expect(sql).toContain("('learning-materials-documents', 'learning-materials-documents', false, 26214400)")
    expect(sql).toContain("('learning-materials-audio', 'learning-materials-audio', false, 52428800)")
    expect(sql).toContain("object_bucket = public.learning_material_bucket_for_extension(object_name)")
  })

  it("rejects a twenty-first real Storage object across all learning buckets", () => {
    expect(sql).toContain("from storage.objects existing_object")
    expect(sql).toContain("storage.foldername(existing_object.name) = storage.foldername(object_name)")
    expect(sql).toContain(") < 20")
    expect(sql).toContain("security definer")
  })

  it("keeps service-role AI access without widening authenticated AI columns", () => {
    expect(sql).toContain("grant select on public.learning_records to service_role")
    expect(sql).toContain("grant select on public.learning_assets to service_role")
    expect(sql).toContain("grant update (processing_status, extracted_text, analysis_json) on public.learning_assets to service_role")
    expect(sql).not.toContain("grant all privileges on public.learning_assets to authenticated")
  })

  it("blocks authenticated record deletion while any real Storage object remains", () => {
    const guard = sql.match(/create or replace function public\.guard_learning_record_delete\(\)[\s\S]*?\$\$;/)?.[0] ?? ""
    expect(guard).toContain("security definer")
    expect(guard).toContain("set search_path = pg_catalog, public, storage")
    expect(guard).toContain("auth.role() = 'authenticated'")
    expect(guard).toContain("from storage.objects object_row")
    expect(guard).toContain("'learning-materials-images'")
    expect(guard).toContain("'learning-materials-documents'")
    expect(guard).toContain("'learning-materials-audio'")
    expect(guard).toContain("old.user_id::text")
    expect(guard).toContain("old.id::text")
    expect(guard).toContain("Learning record still contains Storage objects")
    expect(guard).not.toContain("learning_assets")
  })

  it("keeps service-role maintenance outside the authenticated delete guard and preserves asset cascade", () => {
    expect(sql).toContain("create trigger learning_records_guard_delete before delete on public.learning_records")
    expect(sql).toContain("record_id uuid not null references public.learning_records(id) on delete cascade")
    expect(sql).not.toContain("auth.role() in ('authenticated', 'service_role')")
  })
})
