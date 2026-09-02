import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const sql = readFileSync(new URL("../../supabase/phase27-course-commons.sql", import.meta.url), "utf8")

describe("Phase 27 Course Commons migration", () => {
  it("is transactional and never changes private Learning RLS", () => { expect(sql.trimStart().startsWith("-- Phase 27")).toBe(true); expect(sql).toMatch(/begin;[\s\S]*commit;/); expect(sql).not.toContain("drop policy \"Users read own learning records\""); expect(sql).not.toContain("using (true).*learning_records") })
  it("creates an independent snapshot publishing layer", () => { expect(sql).toContain("create table if not exists public.course_contributions"); expect(sql).toContain("source_record_id uuid references public.learning_records(id) on delete set null"); expect(sql).toContain("course_contribution_assets"); expect(sql).toContain("course_contribution_bookmarks"); expect(sql).toContain("course_contribution_reports") })
  it("keeps historical records private and requires explicit publish RPC", () => { expect(sql).not.toMatch(/insert into public\.course_contributions[\s\S]{0,80}select/); expect(sql).toContain("publish_course_contribution"); expect(sql).toContain("where id = p_source_record_id and user_id = auth.uid()") })
  it("does not grant authenticated direct snapshot or AI writes", () => { expect(sql).toContain("revoke all on public.course_contributions"); expect(sql).not.toContain("grant update (title, content"); expect(sql).not.toContain("grant insert (id, author_id"); expect(sql).toContain("course_commons_analyses to service_role") })
  it("enforces published-only reads, author ownership, and explicit moderation", () => { expect(sql).toContain("visibility = 'course' and status = 'published'"); expect(sql).toContain("author_id = auth.uid()"); expect(sql).toContain("is_admin_or_super(auth.uid())"); expect(sql).toContain("moderation_action = 'hide'") })
  it("uses a private shared bucket and never opens private Learning buckets", () => { expect(sql).toContain("'course-contributions', 'course-contributions', false"); expect(sql).toContain("Authenticated read published course contribution objects"); expect(sql).not.toContain("learning-materials-images', true"); expect(sql).toContain("Shared Storage object missing or size mismatch") })
  it("preserves quote attribution after source deletion", () => { expect(sql).toContain("source_contribution_id"); expect(sql).toContain("source_author_name_snapshot"); expect(sql).toContain("source_title_snapshot"); expect(sql).toContain("quoted_at") })
})
