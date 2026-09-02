import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const manage = readFileSync(new URL("../../supabase/functions/manage-course-contribution/index.ts", import.meta.url), "utf8")
const analyze = readFileSync(new URL("../../supabase/functions/analyze-course-commons/index.ts", import.meta.url), "utf8")

describe("Phase 27 Edge boundaries", () => {
  it("copies only explicitly selected owned private assets to the shared private bucket", () => { expect(manage).toContain("confirmAssetRights !== true"); expect(manage).toContain('.eq("record_id", sourceRecordId).eq("user_id", userId)'); expect(manage).toContain('from("course-contributions").upload'); expect(manage).not.toContain("getPublicUrl") })
  it("unpublishes before deleting only shared copies", () => { expect(manage.indexOf('status: "deleted"')).toBeLessThan(manage.indexOf('storage.from("course-contributions").remove')); expect(manage).not.toContain('storage.from("learning-materials') })
  it("keeps CORS and JWT ownership verification", () => { expect(manage).toContain("authorization, x-client-info, apikey, content-type"); expect(manage).toContain("admin.auth.getUser(token)"); expect(analyze).toContain("admin.auth.getUser(token)") })
  it("summarizes published snapshots only and never private Learning", () => { expect(analyze).toContain('from("course_contributions")'); expect(analyze).toContain('.eq("status", "published")'); expect(analyze).not.toContain('from("learning_records")'); expect(analyze).not.toContain('from("learning_assets")') })
  it("uses fingerprint cache, explicit invocation, and cooldown", () => { expect(analyze).toContain("SHA-256"); expect(analyze).toContain("source_fingerprint === sourceFingerprint"); expect(analyze).toContain("cooldownMs"); expect(analyze).toContain("analysis_cooldown") })
})
