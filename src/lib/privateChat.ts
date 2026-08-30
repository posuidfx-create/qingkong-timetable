import type { RealtimeChannel } from "@supabase/supabase-js"

import { appendUniqueMessage, isPrivateParticipant, parseChatAttachment, sortPrivateConversations, validateMessageContent } from "@/lib/chat"
import { isChatMessageType } from "@/lib/chatMedia"
import { getAuthErrorMessage, isAppRole } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { buildAttachmentMessageRow, logAttachmentInsertDiagnostics, logAttachmentInsertError, sendAttachmentWithCleanup } from "@/lib/chatMediaService"
import type { AppRole } from "@/types/auth"
import type { PrivateConversation, PrivateMessage } from "@/types/chat"
import type { ChatAttachment, ChatMessageType } from "@/types/chat"

const privateMessageSelect = "id, sender_id, receiver_id, content, message_type, attachment_path, attachment_name, attachment_mime, attachment_size, attachment_duration, attachment_width, attachment_height, created_at, read_at, sender:profiles!private_messages_sender_id_fkey(username, role)"

function requireSupabase() {
  if (!supabase) throw new Error("Supabase 尚未配置，聊天暂不可用。")
  return supabase
}

function parsePrivateMessage(value: unknown): PrivateMessage | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== "string" || typeof row.sender_id !== "string" || typeof row.receiver_id !== "string" || typeof row.content !== "string" || typeof row.created_at !== "string" || (row.read_at !== null && typeof row.read_at !== "string")) return null
  const senderRow = Array.isArray(row.sender) ? row.sender[0] : row.sender
  const sender = senderRow && typeof senderRow === "object" && typeof (senderRow as Record<string, unknown>).username === "string" && isAppRole((senderRow as Record<string, unknown>).role) ? { username: (senderRow as Record<string, unknown>).username as string, role: (senderRow as Record<string, unknown>).role as AppRole } : null
  const attachment = parseChatAttachment(row)
  const messageType = row.message_type === null || row.message_type === undefined ? "text" : isChatMessageType(row.message_type) ? row.message_type : null
  if (!messageType || (messageType !== "text" && !attachment)) return null
  return { id: row.id, senderId: row.sender_id, receiverId: row.receiver_id, content: row.content, messageType, attachment, createdAt: row.created_at, readAt: row.read_at, sender }
}

export async function fetchPrivateMessages(otherUserId: string): Promise<PrivateMessage[]> {
  const client = requireSupabase(); const { data: authData } = await client.auth.getUser(); if (!authData.user) throw new Error("登录状态已失效，请重新登录。")
  const { data, error } = await client.from("private_messages").select(privateMessageSelect).or(`and(sender_id.eq.${authData.user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${authData.user.id})`).order("created_at", { ascending: true }).limit(200)
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return (data ?? []).map(parsePrivateMessage).filter((item): item is PrivateMessage => item !== null)
}

export async function sendPrivateMessage(receiverId: string, value: string): Promise<PrivateMessage> {
  const content = validateMessageContent(value); if (!content) throw new Error("消息不能为空且不能超过 2000 个字符。")
  const client = requireSupabase(); const { data: authData } = await client.auth.getUser(); if (!authData.user) throw new Error("登录状态已失效，请重新登录。")
  const { data, error } = await client.from("private_messages").insert({ sender_id: authData.user.id, receiver_id: receiverId, content }).select(privateMessageSelect).single()
  if (error) throw new Error(getAuthErrorMessage(error.message)); const message = parsePrivateMessage(data); if (!message) throw new Error("消息格式异常。"); return message
}

export async function sendPrivateAttachment(receiverId: string, file: File, metadata?: { duration?: number | null; width?: number | null; height?: number | null }): Promise<PrivateMessage> {
  return sendAttachmentWithCleanup(file, { kind: "private", otherUserId: receiverId }, async (attachment: ChatAttachment, messageType: Exclude<ChatMessageType, "text">) => {
    const client = requireSupabase(); const { data: authData } = await client.auth.getUser(); if (!authData.user) throw new Error("登录状态已失效，请重新登录。")
    const row = { sender_id: authData.user.id, receiver_id: receiverId, ...buildAttachmentMessageRow(attachment, messageType) }
    logAttachmentInsertDiagnostics("private_messages", row)
    const { data, error } = await client.from("private_messages").insert(row).select(privateMessageSelect).single()
    if (error) { logAttachmentInsertError("private_messages", error); throw new Error(getAuthErrorMessage(error.message)) } const message = parsePrivateMessage(data); if (!message) throw new Error("消息格式异常。"); return message
  }, metadata)
}

export async function markPrivateMessagesRead(otherUserId: string): Promise<void> {
  const client = requireSupabase(); const { data: authData } = await client.auth.getUser(); if (!authData.user) return
  const { error } = await client.from("private_messages").update({ read_at: new Date().toISOString() }).eq("sender_id", otherUserId).eq("receiver_id", authData.user.id).is("read_at", null)
  if (error) throw new Error(getAuthErrorMessage(error.message))
}

export async function fetchUnreadPrivateCount(): Promise<number> {
  const client = requireSupabase(); const { data: authData } = await client.auth.getUser(); if (!authData.user) return 0
  const { count, error } = await client.from("private_messages").select("id", { count: "exact", head: true }).eq("receiver_id", authData.user.id).is("read_at", null)
  if (error) throw new Error(getAuthErrorMessage(error.message)); return count ?? 0
}

export async function fetchPrivateConversations(): Promise<PrivateConversation[]> {
  const client = requireSupabase(); const { data: authData } = await client.auth.getUser(); if (!authData.user) return []
  const { data, error } = await client.from("private_messages").select("sender_id, receiver_id, content, created_at, read_at, sender:profiles!private_messages_sender_id_fkey(username, role, cohort_year), receiver:profiles!private_messages_receiver_id_fkey(username, role, cohort_year)").order("created_at", { ascending: false }).limit(500)
  if (error) throw new Error(getAuthErrorMessage(error.message))
  const conversations = new Map<string, PrivateConversation>()
  for (const value of data ?? []) {
    const row = value as Record<string, unknown>; const senderId = row.sender_id; const receiverId = row.receiver_id
    if (typeof senderId !== "string" || typeof receiverId !== "string") continue
    const isSent = senderId === authData.user.id; const otherId = isSent ? receiverId : senderId
    const otherField = isSent ? row.receiver : row.sender
    const rawOther = Array.isArray(otherField) ? otherField[0] : otherField
    if (!rawOther || typeof rawOther !== "object") continue
    const other = rawOther as Record<string, unknown>
    if (typeof other.username !== "string" || !isAppRole(other.role) || (other.cohort_year !== null && other.cohort_year !== 2024 && other.cohort_year !== 2025) || typeof row.content !== "string" || typeof row.created_at !== "string") continue
    const current = conversations.get(otherId); const unread = !isSent && row.read_at === null ? 1 : 0
    if (current) { current.unreadCount += unread; continue }
    conversations.set(otherId, { userId: otherId, username: other.username, role: other.role, cohortYear: other.cohort_year as 2024 | 2025 | null, lastContent: row.content, lastCreatedAt: row.created_at, unreadCount: unread })
  }
  return sortPrivateConversations([...conversations.values()])
}

export function subscribeToPrivateMessages(userId: string, otherUserId: string, onMessage: (message: PrivateMessage) => void): RealtimeChannel {
  const client = requireSupabase()
  return client.channel(`private:${[userId, otherUserId].sort().join(":")}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages" }, async (payload) => {
    const message = parsePrivateMessage(payload.new); if (!message || !isPrivateParticipant(message, userId, otherUserId)) return
    const { data } = await client.from("profiles").select("username, role").eq("id", message.senderId).single(); const sender = data && typeof data.username === "string" && isAppRole(data.role) ? { username: data.username, role: data.role } : null
    onMessage({ ...message, sender })
  }).subscribe()
}

export function appendPrivateMessage(messages: readonly PrivateMessage[], message: PrivateMessage): PrivateMessage[] { return appendUniqueMessage(messages, message) }
