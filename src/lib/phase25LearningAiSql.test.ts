import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

const sql = readFileSync(new URL("../../supabase/phase25-learning-record-analysis.sql", import.meta.url), "utf8")

describe("record-level Learning AI migration", () => {
  it("is transactional and adds nullable analysis with a safe default status", () => {
    expect(sql.trimStart()).toContain("begin;")
    expect(sql.trimEnd()).toMatch(/commit;$/)
    expect(sql).toContain("processing_status text not null default 'uploaded'")
    expect(sql).toContain("analysis_json jsonb")
  })

  it("prevents authenticated clients from spoofing AI results", () => {
    expect(sql).toContain("auth.role() = 'authenticated'")
    expect(sql).toContain("new.analysis_json is not null")
    expect(sql).toContain("new.analysis_json is distinct from old.analysis_json")
    const grants = sql.match(/grant (?:insert|update) \([\s\S]*?\) on public\.learning_records to authenticated;/g)?.join(" ") ?? ""
    expect(grants).not.toMatch(/processing_status|analysis_json/)
  })

  it("keeps service-role AI writes narrow and does not alter RLS", () => {
    expect(sql).toContain("grant update (processing_status, analysis_json) on public.learning_records to service_role")
    expect(sql).not.toMatch(/create policy|drop policy|disable row level security/i)
  })
})
