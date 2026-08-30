import { describe, expect, it } from "vitest"
import { createAuthStorage, setAuthPersistence } from "@/lib/authPersistence"
import { MemoryStorage } from "@/test/memoryStorage"

describe("auth persistence", () => {
  it("stores remembered sessions locally and non-remembered sessions per tab", () => {
    const local = new MemoryStorage(); const session = new MemoryStorage(); const storage = createAuthStorage(local, session)
    setAuthPersistence(true); storage.setItem("token", "local-token"); expect(local.getItem("token")).toBe("local-token")
    setAuthPersistence(false); storage.setItem("token", "session-token"); expect(session.getItem("token")).toBe("session-token"); expect(local.getItem("token")).toBeNull()
  })
  it("removes sessions from both storage locations on sign out", () => {
    const local = new MemoryStorage(); const session = new MemoryStorage(); const storage = createAuthStorage(local, session)
    local.setItem("token", "a"); session.setItem("token", "b"); storage.removeItem("token")
    expect(local.getItem("token")).toBeNull(); expect(session.getItem("token")).toBeNull()
  })
  it("returns the complete raw Supabase session value without transforming it", () => {
    const local = new MemoryStorage(); const session = new MemoryStorage(); const storage = createAuthStorage(local, session)
    const rawSession = JSON.stringify({ access_token: "access", refresh_token: "refresh", user: { id: "user" } })
    setAuthPersistence(true); storage.setItem("supabase.auth.token", rawSession)
    expect(storage.getItem("supabase.auth.token")).toBe(rawSession)
  })
})
