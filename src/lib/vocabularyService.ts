import { getAuthErrorMessage } from "@/lib/auth"
import { executeVocabularyBulkDelete, type VocabularyBulkDeleteResult } from "@/lib/vocabularyBulkDelete"
import { buildVocabularyInsertRow, parseVocabularyWord } from "@/lib/vocabulary"
import { supabase } from "@/lib/supabase"
import type { VocabularyWord, VocabularyWordDraft } from "@/types/vocabulary"

const vocabularyColumns = "id, user_id, term, language, reading, meaning, notes, course_name, course_key, textbook_key, volume, lesson_number, mastery, analysis_status, analysis_json, created_at, updated_at"

export type VocabularyServiceErrorCode = "not_configured" | "auth_required" | "load_failed" | "save_failed" | "duplicate" | "delete_failed"

export class VocabularyServiceError extends Error {
  constructor(public readonly code: VocabularyServiceErrorCode, public readonly cause?: unknown) { super(code) }
}

function requireSupabase() {
  if (!supabase) throw new VocabularyServiceError("not_configured")
  return supabase
}

async function currentUserId(): Promise<string> {
  const { data, error } = await requireSupabase().auth.getUser()
  if (error || !data.user?.id) throw new VocabularyServiceError("auth_required", error)
  return data.user.id
}

function isDuplicateError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "23505")
}

export async function fetchVocabularyWords(): Promise<VocabularyWord[]> {
  const { data, error } = await requireSupabase().from("vocabulary_words").select(vocabularyColumns).order("created_at", { ascending: false })
  if (error) throw new VocabularyServiceError("load_failed", error)
  return (data ?? []).map(parseVocabularyWord).filter((item): item is VocabularyWord => item !== null)
}

export async function fetchVocabularyWordById(id: string): Promise<VocabularyWord> {
  const { data, error } = await requireSupabase().from("vocabulary_words").select(vocabularyColumns).eq("id", id).single()
  if (error) throw new VocabularyServiceError("load_failed", error)
  const word = parseVocabularyWord(data)
  if (!word) throw new VocabularyServiceError("load_failed")
  return word
}

export async function createVocabularyWord(draft: VocabularyWordDraft): Promise<VocabularyWord> {
  const client = requireSupabase()
  const userId = await currentUserId()
  const id = crypto.randomUUID()
  const { error } = await client.from("vocabulary_words").insert(buildVocabularyInsertRow(draft, userId, id))
  if (error) throw new VocabularyServiceError(isDuplicateError(error) ? "duplicate" : "save_failed", error)
  return fetchVocabularyWordById(id)
}

export async function updateVocabularyWord(word: VocabularyWord, draft: VocabularyWordDraft): Promise<VocabularyWord> {
  const userId = await currentUserId()
  if (word.userId !== userId) throw new VocabularyServiceError("save_failed")
  const { id: _id, user_id: _userId, ...row } = buildVocabularyInsertRow(draft, userId, word.id)
  void _id; void _userId
  const { error } = await requireSupabase().from("vocabulary_words").update(row).eq("id", word.id)
  if (error) throw new VocabularyServiceError(isDuplicateError(error) ? "duplicate" : "save_failed", error)
  return fetchVocabularyWordById(word.id)
}

export async function deleteVocabularyWord(word: VocabularyWord): Promise<void> {
  const userId = await currentUserId()
  if (word.userId !== userId) throw new VocabularyServiceError("delete_failed")
  const { error } = await requireSupabase().from("vocabulary_words").delete().eq("id", word.id)
  if (error) throw new VocabularyServiceError("delete_failed", error)
}

export async function deleteVocabularyWords(ids: readonly string[]): Promise<VocabularyBulkDeleteResult> {
  await currentUserId()
  const client = requireSupabase()
  return executeVocabularyBulkDelete(ids, async (chunk) => {
    const { data, error } = await client.from("vocabulary_words").delete().in("id", [...chunk]).select("id")
    if (error) throw new VocabularyServiceError("delete_failed", error)
    return (data ?? []).flatMap((row) => typeof row.id === "string" ? [row.id] : [])
  })
}

export function getVocabularyServiceErrorMessage(error: unknown): VocabularyServiceErrorCode | string {
  if (error instanceof VocabularyServiceError) return error.code
  return error instanceof Error ? getAuthErrorMessage(error.message) : "save_failed"
}
