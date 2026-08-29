import { useEffect, useState } from "react"

import { subscribeToPresence } from "@/lib/presence"
import type { Profile } from "@/types/auth"
import type { PresenceUser } from "@/types/chat"

export function useOnlinePresence(profile: Profile | null): PresenceUser[] {
  const [users, setUsers] = useState<PresenceUser[]>([])
  useEffect(() => {
    if (!profile) return
    const channel = subscribeToPresence({ userId: profile.id, username: profile.username, cohortYear: profile.cohortYear, role: profile.role }, setUsers)
    return () => { if (channel) void channel.unsubscribe() }
  }, [profile])
  return users
}
