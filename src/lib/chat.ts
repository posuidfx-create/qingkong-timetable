import { isAppRole } from "@/lib/auth"
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
  return { id: row.id, roomType: row.room_type, senderId: row.sender_id, content: row.content, createdAt: row.created_at, sender }
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
