import type { RealtimeChannel } from "@supabase/supabase-js"

import { appendUniqueMessage, parseChatMessage, validateMessageContent } from "@/lib/chat"
import { getAuthErrorMessage, isAppRole } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { buildAttachmentMessageRow, cleanupDeletedChatAttachment, sendAttachmentWithCleanup } from "@/lib/chatMediaService"
import type { ChatAttachment, ChatMessage, ChatMessageType, ChatRoomType } from "@/types/chat"

const roomMessageSelect = "id, room_type, sender_id, content, message_type, attachment_path, attachment_name, attachment_mime, attachment_size, attachment_duration, attachment_width, attachment_height, created_at, sender:profiles!chat_messages_sender_id_fkey(username, role)"

function requireSupabase() {
  if (!supabase) throw new Error("Supabase 尚未配置，聊天暂不可用。")
  return supabase
}

function parseMessages(rows: unknown[]): ChatMessage[] {
  return rows.map(parseChatMessage).filter((item): item is ChatMessage => item !== null)
}

export async function fetchRoomMessages(roomType: ChatRoomType): Promise<ChatMessage[]> {
  const { data, error } = await requireSupabase().from("chat_messages").select(roomMessageSelect).eq("room_type", roomType).order("created_at", { ascending: true }).limit(200)
  if (error) throw new Error(getAuthErrorMessage(error.message))
  return parseMessages(data ?? [])
}

export async function sendRoomMessage(roomType: ChatRoomType, value: string): Promise<ChatMessage> {
  const content = validateMessageContent(value)
  if (!content) throw new Error("消息不能为空且不能超过 2000 个字符。")
  const client = requireSupabase()
  const { data: authData } = await client.auth.getUser()
  if (!authData.user) throw new Error("登录状态已失效，请重新登录。")
  const { data, error } = await client.from("chat_messages").insert({ room_type: roomType, sender_id: authData.user.id, content }).select(roomMessageSelect).single()
  if (error) throw new Error(getAuthErrorMessage(error.message))
  const message = parseChatMessage(data)
  if (!message) throw new Error("消息格式异常。")
  return message
}

export async function sendRoomAttachment(roomType: ChatRoomType, file: File, metadata?: { duration?: number | null; width?: number | null; height?: number | null }): Promise<ChatMessage> {
  return sendAttachmentWithCleanup(file, { kind: "group", roomType }, async (attachment: ChatAttachment, messageType: Exclude<ChatMessageType, "text">) => {
    const client = requireSupabase(); const { data: authData } = await client.auth.getUser(); if (!authData.user) throw new Error("登录状态已失效，请重新登录。")
    const row = { room_type: roomType, sender_id: authData.user.id, ...buildAttachmentMessageRow(attachment, messageType) }
    const { data, error } = await client.from("chat_messages").insert(row).select(roomMessageSelect).single()
    if (error) throw new Error(getAuthErrorMessage(error.message)); const message = parseChatMessage(data); if (!message) throw new Error("消息格式异常。"); return message
  }, metadata)
}

export async function deleteRoomMessage(id: string): Promise<void> {
  const client = requireSupabase()
  const { data: existing, error: readError } = await client.from("chat_messages").select("attachment_path").eq("id", id).single()
  if (readError) throw new Error(getAuthErrorMessage(readError.message))
  const { error } = await client.from("chat_messages").delete().eq("id", id)
  if (error) throw new Error(getAuthErrorMessage(error.message))
  await cleanupDeletedChatAttachment(existing && typeof existing.attachment_path === "string" ? existing.attachment_path : null)
}

export function subscribeToRoomMessages(roomType: ChatRoomType, onMessage: (message: ChatMessage) => void): RealtimeChannel {
  const client = requireSupabase()
  return client.channel(`room:${roomType}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_type=eq.${roomType}` }, async (payload) => {
      const basic = parseChatMessage(payload.new)
      if (!basic) return
      const { data } = await client.from("profiles").select("username, role").eq("id", basic.senderId).single()
      const sender = data && typeof data.username === "string" && isAppRole(data.role) ? { username: data.username, role: data.role } : null
      onMessage({ ...basic, sender })
    })
    .subscribe()
}

export function appendRoomMessage(messages: readonly ChatMessage[], message: ChatMessage): ChatMessage[] {
  return appendUniqueMessage(messages, message)
}
