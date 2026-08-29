import type { RealtimeChannel } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"
import type { PresenceUser } from "@/types/chat"

export function subscribeToPresence(user: PresenceUser, onChange: (users: PresenceUser[]) => void): RealtimeChannel | null {
  if (!supabase) return null
  const channel = supabase.channel("timetable-online-users", { config: { presence: { key: user.userId } } })
  channel.on("presence", { event: "sync" }, () => {
    const unique = new Map<string, PresenceUser>()
    Object.values(channel.presenceState<PresenceUser>()).flat().forEach((item) => unique.set(item.userId, item))
    onChange([...unique.values()])
  }).subscribe((status) => { if (status === "SUBSCRIBED") void channel.track(user) })
  return channel
}
