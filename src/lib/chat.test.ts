import { describe, expect, it } from "vitest"

import { appendUniqueMessage, canAccessChatRoom, countUnreadMessages, formatChatDateDivider, getAvailableRooms, getChatMessagePresentation, getMessageBubbleSide, getRoomDescription, getRoomLabel, isPrivateParticipant, parseChatMessage, shouldSendChatOnEnter, sortPrivateConversations, validateMessageContent } from "@/lib/chat"
import type { Profile } from "@/types/auth"

const base: Profile = { id: "u", username: "晴空", title: null, avatarUrl: null, role: "user", identityType: "student", cohortYear: 2024, createdAt: "2026-01-01T00:00:00.000Z" }

describe("chat domain helpers", () => {
  it("grants rooms by profile cohort, not timetable selection", () => {
    expect(getAvailableRooms(base)).toEqual(["public", "cohort_2024"])
    expect(getAvailableRooms({ ...base, cohortYear: 2025 })).toEqual(["public", "cohort_2025"])
  })
  it("does not change chat access when the timetable cohort is switched", () => {
    const profileRooms = getAvailableRooms(base)
    const timetableSelections = [2024, 2025] as const
    timetableSelections.forEach(() => expect(getAvailableRooms(base)).toEqual(profileRooms))
  })
  it("grants both cohort rooms to admins and super admins", () => {
    expect(getAvailableRooms({ ...base, role: "admin" })).toEqual(["public", "cohort_2024", "cohort_2025"])
    expect(getAvailableRooms({ ...base, role: "super_admin", cohortYear: null })).toEqual(["public", "cohort_2024", "cohort_2025"])
  })
  it("keeps ordinary teachers in public chat while teacher admins can access every room", () => {
    expect(getAvailableRooms({ ...base, identityType: "teacher", cohortYear: null })).toEqual(["public"])
    expect(getAvailableRooms({ ...base, identityType: "teacher", cohortYear: null, role: "admin" })).toEqual(["public", "cohort_2024", "cohort_2025"])
    expect(getAvailableRooms({ ...base, identityType: "teacher", cohortYear: null, role: "super_admin" })).toEqual(["public", "cohort_2024", "cohort_2025"])
  })
  it("keeps unavailable cohort rooms locked while admins can select all three", () => {
    expect(canAccessChatRoom(getAvailableRooms(base), "cohort_2025")).toBe(false)
    expect(canAccessChatRoom(getAvailableRooms({ ...base, role: "admin" }), "cohort_2025")).toBe(true)
  })
  it("labels rooms and validates trimmed message content", () => {
    expect(getRoomLabel("public")).toBe("公共聊天室")
    expect(getRoomDescription("cohort_2025")).toBe("25级同学专属聊天室")
    expect(validateMessageContent("  你好  ")).toBe("你好")
    expect(validateMessageContent(" \n ")).toBeNull()
    expect(validateMessageContent("a".repeat(2001))).toBeNull()
  })
  it("deduplicates realtime messages and identifies private participants", () => {
    expect(appendUniqueMessage([{ id: "a" }], { id: "a" })).toHaveLength(1)
    expect(isPrivateParticipant({ senderId: "a", receiverId: "b" }, "b", "a")).toBe(true)
    expect(isPrivateParticipant({ senderId: "a", receiverId: "c" }, "b", "a")).toBe(false)
  })
  it("counts only unread messages received by the current user", () => {
    expect(countUnreadMessages([{ receiverId: "a", readAt: null }, { receiverId: "a", readAt: "now" }, { receiverId: "b", readAt: null }], "a")).toBe(1)
  })
  it("sorts conversations and determines the message bubble side", () => {
    expect(sortPrivateConversations([{ userId: "a", username: "A", role: "user", cohortYear: 2024, lastContent: "old", lastCreatedAt: "2026-01-01T00:00:00Z", unreadCount: 0 }, { userId: "b", username: "B", role: "user", cohortYear: 2025, lastContent: "new", lastCreatedAt: "2026-01-02T00:00:00Z", unreadCount: 1 }]).map((item) => item.userId)).toEqual(["b", "a"])
    expect(getMessageBubbleSide("me", "me")).toBe("right")
    expect(getMessageBubbleSide("other", "me")).toBe("left")
  })
  it("groups consecutive messages and inserts local date dividers", () => {
    const now = new Date("2026-08-30T12:00:00")
    const presentation = getChatMessagePresentation([
      { senderId: "a", createdAt: "2026-08-30T09:00:00" },
      { senderId: "a", createdAt: "2026-08-30T09:03:00" },
      { senderId: "b", createdAt: "2026-08-30T09:05:00" },
      { senderId: "b", createdAt: "2026-08-29T09:05:00" },
    ], now)
    expect(presentation.map((item) => item.showSender)).toEqual([true, false, true, true])
    expect(presentation.map((item) => item.dateDivider)).toEqual(["今天", null, null, "昨天"])
    expect(formatChatDateDivider("2026-08-28T09:05:00", now)).toBe("8月28日")
  })
  it("sends on Enter without disrupting IME composition or Shift+Enter", () => {
    expect(shouldSendChatOnEnter({ key: "Enter", shiftKey: false, isComposing: false })).toBe(true)
    expect(shouldSendChatOnEnter({ key: "Enter", shiftKey: true, isComposing: false })).toBe(false)
    expect(shouldSendChatOnEnter({ key: "Enter", shiftKey: false, isComposing: true })).toBe(false)
  })
  it("keeps old text messages compatible and parses every attachment type", () => {
    const row = { id: "m", room_type: "public", sender_id: "u", content: "", created_at: "2026-08-30T00:00:00Z", attachment_path: "group/public/u/a.png", attachment_name: "a.png", attachment_mime: "image/png", attachment_size: 100, attachment_duration: null, attachment_width: null, attachment_height: null }
    expect(parseChatMessage({ ...row, content: "旧消息" })?.messageType).toBe("text")
    ;(["image", "file", "audio", "video"] as const).forEach((messageType) => expect(parseChatMessage({ ...row, message_type: messageType })?.messageType).toBe(messageType))
  })
})
