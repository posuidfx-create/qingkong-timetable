import { describe, expect, it } from "vitest"

import { appendUniqueMessage, countUnreadMessages, getAvailableRooms, getMessageBubbleSide, getRoomLabel, isPrivateParticipant, sortPrivateConversations, validateMessageContent } from "@/lib/chat"
import type { Profile } from "@/types/auth"

const base: Profile = { id: "u", username: "晴空", avatarUrl: null, role: "user", cohortYear: 2024, createdAt: "2026-01-01T00:00:00.000Z" }

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
  it("labels rooms and validates trimmed message content", () => {
    expect(getRoomLabel("public")).toBe("公共聊天室")
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
})
