import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const sql = readFileSync(new URL("../../supabase/phase25-vocabulary.sql", import.meta.url), "utf8")

describe("Phase 25 vocabulary SQL security", () => {
  it("keeps every vocabulary row private to auth.uid()", () => {
    expect(sql).toContain("alter table public.vocabulary_words enable row level security")
    expect((sql.match(/user_id = auth\.uid\(\)/g) ?? []).length).toBeGreaterThanOrEqual(4)
    expect(sql).not.toContain("is_admin_or_super")
    expect(sql).toContain('create policy "Users delete own vocabulary"')
    expect(sql).toMatch(/for delete\s+to authenticated\s+using \(user_id = auth\.uid\(\)\)/s)
  })

  it("prevents authenticated clients from spoofing cached AI output", () => {
    expect(sql).toContain("guard_vocabulary_ai_fields")
    expect(sql).toContain("new.analysis_status <> 'uploaded'")
    expect(sql).toContain("new.analysis_json is not null")
    expect(sql).toContain("revoke insert, update on public.vocabulary_words from authenticated")
    expect(sql).not.toMatch(/grant update \([^)]*analysis_json[^)]*\) on public\.vocabulary_words to authenticated/s)
  })

  it("allows only the service role to update AI cache columns", () => {
    expect(sql).toContain("grant update (analysis_status, analysis_json) on public.vocabulary_words to service_role")
  })

  it("enforces duplicate prevention and transaction safety", () => {
    expect(sql).toContain("unique index if not exists vocabulary_words_user_term_language_uidx")
    expect(sql.trimStart().startsWith("-- Phase 25")).toBe(true)
    expect(sql).toContain("begin;")
    expect(sql.trimEnd().endsWith("commit;")).toBe(true)
  })
})
