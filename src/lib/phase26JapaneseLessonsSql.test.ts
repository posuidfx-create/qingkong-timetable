import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const sql = readFileSync(new URL("../../supabase/phase26-japanese-lessons.sql", import.meta.url), "utf8")

describe("Phase 26 Japanese lessons SQL", () => {
  it("adds nullable lesson organization without rewriting existing words", () => {
    expect(sql).toContain("add column if not exists textbook_key text")
    expect(sql).toContain("add column if not exists lesson_number integer")
    expect(sql).not.toMatch(/update\s+public\.vocabulary_words\s+set\s+lesson_number/i)
  })

  it("enforces lesson 1-50 and correct volume boundaries", () => {
    expect(sql).toContain("lesson_number between 1 and 50")
    expect(sql).toContain("when lesson_number <= 25 then 'beginner_1' else 'beginner_2'")
  })

  it("keeps grammar and lesson analyses own-only", () => {
    expect(sql).toContain('create policy "Users read own grammar"')
    expect(sql).toContain('create policy "Users create own grammar"')
    expect(sql).toContain('create policy "Users read own lesson analyses"')
    expect(sql.match(/user_id = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(6)
    expect(sql).not.toMatch(/using\s*\(true\)/i)
    expect(sql).not.toMatch(/grant insert[^;]*public\.vocabulary_lesson_analyses[^;]*authenticated/i)
  })

  it("prevents authenticated clients from forging AI fields", () => {
    expect(sql).toContain("Authenticated clients cannot set grammar AI results")
    expect(sql).toContain("Authenticated clients cannot set lesson AI results")
    expect(sql).toContain("grant update (analysis_status, analysis_json) on public.grammar_items to service_role")
    expect(sql).toContain("grant update (analysis_status, analysis_json) on public.vocabulary_lesson_analyses to service_role")
  })

  it("is transactional", () => {
    expect(sql.trimStart()).toMatch(/^--[\s\S]*?begin;/)
    expect(sql.trimEnd()).toMatch(/commit;$/)
  })
})
