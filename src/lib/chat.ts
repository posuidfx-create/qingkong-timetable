import { isAppRole } from "@/lib/auth"
import { isChatMessageType } from "@/lib/chatMedia"
import type { Profile } from "@/types/auth"
import { CHAT_ROOM_TYPES, type ChatMessage, type ChatRoomType } from "@/types/chat"
import type { PrivateConversation } from "@/types/chat"

export function isChatRoomType(value: unknown): value is ChatRoomType {
  return typeof value === "string" && CHAT_ROOM_TYPES.includes(value as ChatRoomType)
}

export function getAvailableRooms(profile: Profile): ChatRoomType[] {
  if (profile.role !== "user") return ["public", "cohort_2024", "cohort_2025"]
  return profile.cohortYear === 2024 ? ["public", "cohort_2024"] : profile.cohortYear === 2025 ? ["public", "cohort_2025"] : ["public"]
}

export function getRoomLabel(room: ChatRoomType): string {
  return { public: "公共聊天室", cohort_2024: "24级聊天室", cohort_2025: "25级聊天室" }[room]
}

export function validateMessageContent(value: string): string | null {
  const content = value.trim()
  if (!content) return null
  return content.length <= 2000 ? content : null
}

export function appendUniqueMessage<T extends { id: string }>(messages: readonly T[], message: T): T[] {
  return messages.some((item) => item.id === message.id) ? [...messages] : [...messages, message]
}

export function parseChatMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== "string" || !isChatRoomType(row.room_type) || typeof row.sender_id !== "string" || typeof row.content !== "string" || typeof row.created_at !== "string") return null
  const senderRow = Array.isArray(row.sender) ? row.sender[0] : row.sender
  const sender = senderRow && typeof senderRow === "object" && typeof (senderRow as Record<string, unknown>).username === "string" && isAppRole((senderRow as Record<string, unknown>).role) ? { username: (senderRow as Record<string, unknown>).username as string, role: (senderRow as Record<string, unknown>).role as Profile["role"] } : null
  const attachment = parseChatAttachment(row)
  const messageType = row.message_type === null || row.message_type === undefined ? "text" : isChatMessageType(row.message_type) ? row.message_type : null
  if (!messageType || (messageType !== "text" && !attachment)) return null
  return { id: row.id, roomType: row.room_type, senderId: row.sender_id, content: row.content, messageType, attachment, createdAt: row.created_at, sender }
}

export function parseChatAttachment(row: Record<string, unknown>) {
  if (row.attachment_path === null || row.attachment_path === undefined) return null
  if (typeof row.attachment_path !== "string" || typeof row.attachment_name !== "string" || typeof row.attachment_mime !== "string" || typeof row.attachment_size !== "number") return null
  const optionalNumber = (value: unknown) => value === null || value === undefined ? null : typeof value === "number" ? value : null
  const duration = optionalNumber(row.attachment_duration)
  const width = optionalNumber(row.attachment_width)
  const height = optionalNumber(row.attachment_height)
  if ((row.attachment_duration !== null && row.attachment_duration !== undefined && duration === null) || (row.attachment_width !== null && row.attachment_width !== undefined && width === null) || (row.attachment_height !== null && row.attachment_height !== undefined && height === null)) return null
  return { path: row.attachment_path, name: row.attachment_name, mime: row.attachment_mime, size: row.attachment_size, duration, width, height }
}

export function isPrivateParticipant(message: { senderId: string; receiverId: string }, firstId: string, secondId: string): boolean {
  return (message.senderId === firstId && message.receiverId === secondId) || (message.senderId === secondId && message.receiverId === firstId)
}

export function countUnreadMessages(messages: readonly { receiverId: string; readAt: string | null }[], userId: string): number {
  return messages.filter((message) => message.receiverId === userId && message.readAt === null).length
}

export function getMessageBubbleSide(senderId: string, currentUserId: string): "left" | "right" {
  return senderId === currentUserId ? "right" : "left"
}

export function sortPrivateConversations(conversations: readonly PrivateConversation[]): PrivateConversation[] {
  return [...conversations].sort((left, right) => new Date(right.lastCreatedAt).getTime() - new Date(left.lastCreatedAt).getTime())
}

export function shouldSendChatOnEnter({ key, shiftKey, isComposing }: { key: string; shiftKey: boolean; isComposing: boolean }): boolean {
  return key === "Enter" && !shiftKey && !isComposing
}

interface DisplayMessage {
  senderId: string
  createdAt: string
}

export interface ChatMessagePresentation<T extends DisplayMessage> {
  item: T
  dateDivider: string | null
  showSender: boolean
}

function localDateKey(value: string): string {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function formatChatDateDivider(value: string, now = new Date()): string {
  const date = new Date(value)
  const dayMs = 24 * 60 * 60 * 1000
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  if (target === today) return "今天"
  if (target === today - dayMs) return "昨天"
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function getChatMessagePresentation<T extends DisplayMessage>(messages: readonly T[], now = new Date()): ChatMessagePresentation<T>[] {
  return messages.map((item, index) => {
    const previous = messages[index - 1]
    const sameDate = previous && localDateKey(previous.createdAt) === localDateKey(item.createdAt)
    const closeTogether = previous && new Date(item.createdAt).getTime() - new Date(previous.createdAt).getTime() <= 5 * 60 * 1000
    return {
      item,
      dateDivider: !sameDate ? formatChatDateDivider(item.createdAt, now) : null,
      showSender: !previous || previous.senderId !== item.senderId || !closeTogether || !sameDate,
    }
  })
}
