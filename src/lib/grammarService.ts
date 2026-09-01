import { buildGrammarInsertRow, parseGrammarItem } from "@/lib/japaneseLessons"
import { supabase } from "@/lib/supabase"
import type { GrammarItem, GrammarItemDraft } from "@/types/vocabulary"

const grammarColumns = "id, user_id, textbook_key, volume, lesson_number, pattern, meaning, connection, usage_note, example, example_translation, personal_note, mastery, analysis_status, analysis_json, created_at, updated_at"

export class GrammarServiceError extends Error {
  constructor(public readonly code: "not_configured" | "auth_required" | "load_failed" | "save_failed" | "delete_failed", public readonly cause?: unknown) { super(code) }
}

function requireClient() {
  if (!supabase) throw new GrammarServiceError("not_configured")
  return supabase
}

async function currentUserId(): Promise<string> {
  const { data, error } = await requireClient().auth.getUser()
  if (error || !data.user?.id) throw new GrammarServiceError("auth_required", error)
  return data.user.id
}

export async function fetchGrammarItems(): Promise<GrammarItem[]> {
  const { data, error } = await requireClient().from("grammar_items").select(grammarColumns).order("lesson_number").order("created_at")
  if (error) throw new GrammarServiceError("load_failed", error)
  return (data ?? []).map(parseGrammarItem).filter((item): item is GrammarItem => item !== null)
}

export async function fetchGrammarItemById(id: string): Promise<GrammarItem> {
  const { data, error } = await requireClient().from("grammar_items").select(grammarColumns).eq("id", id).single()
  if (error) throw new GrammarServiceError("load_failed", error)
  const item = parseGrammarItem(data)
  if (!item) throw new GrammarServiceError("load_failed")
  return item
}

export async function createGrammarItem(draft: GrammarItemDraft): Promise<GrammarItem> {
  const userId = await currentUserId()
  const id = crypto.randomUUID()
  const { error } = await requireClient().from("grammar_items").insert(buildGrammarInsertRow(draft, userId, id))
  if (error) throw new GrammarServiceError("save_failed", error)
  return fetchGrammarItemById(id)
}

export async function updateGrammarItem(item: GrammarItem, draft: GrammarItemDraft): Promise<GrammarItem> {
  const userId = await currentUserId()
  if (item.userId !== userId) throw new GrammarServiceError("save_failed")
  const { id: _id, user_id: _userId, ...row } = buildGrammarInsertRow(draft, userId, item.id)
  void _id; void _userId
  const { error } = await requireClient().from("grammar_items").update(row).eq("id", item.id)
  if (error) throw new GrammarServiceError("save_failed", error)
  return fetchGrammarItemById(item.id)
}

export async function deleteGrammarItem(item: GrammarItem): Promise<void> {
  const userId = await currentUserId()
  if (item.userId !== userId) throw new GrammarServiceError("delete_failed")
  const { error } = await requireClient().from("grammar_items").delete().eq("id", item.id)
  if (error) throw new GrammarServiceError("delete_failed", error)
}
