import type { AppRole, ProfileCohortYear } from "@/types/auth"

export const CHAT_ROOM_TYPES = ["public", "cohort_2024", "cohort_2025"] as const
export type ChatRoomType = (typeof CHAT_ROOM_TYPES)[number]
export const CHAT_MESSAGE_TYPES = ["text", "image", "file", "audio", "video"] as const
export type ChatMessageType = (typeof CHAT_MESSAGE_TYPES)[number]

export interface ChatAttachment {
  path: string
  name: string
  mime: string
  size: number
  duration: number | null
  width: number | null
  height: number | null
}

export interface ChatMessageBase {
  content: string
  messageType: ChatMessageType
  attachment: ChatAttachment | null
}

export interface ChatMessage extends ChatMessageBase {
  id: string
  roomType: ChatRoomType
  senderId: string
  content: string
  createdAt: string
  sender?: { username: string; role: AppRole } | null
}

export interface PrivateMessage extends ChatMessageBase {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  readAt: string | null
  sender?: { username: string; role: AppRole } | null
}

export interface PrivateConversation {
  userId: string
  username: string
  role: AppRole
  cohortYear: ProfileCohortYear | null
  lastContent: string
  lastCreatedAt: string
  unreadCount: number
}

export interface PresenceUser {
  userId: string
  username: string
  cohortYear: ProfileCohortYear | null
  role: AppRole
}
