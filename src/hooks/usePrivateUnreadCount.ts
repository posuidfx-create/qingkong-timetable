import { useCallback, useEffect, useState } from "react"

import { fetchUnreadPrivateCount } from "@/lib/privateChat"
import { supabase } from "@/lib/supabase"

export function usePrivateUnreadCount(userId: string | undefined): { count: number; refresh: () => void } {
  const [count, setCount] = useState(0)
  const refresh = useCallback(() => { void fetchUnreadPrivateCount().then(setCount).catch(() => setCount(0)) }, [])
  useEffect(() => {
    if (!userId || !supabase) return
    refresh()
    const channel = supabase.channel(`unread:${userId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages", filter: `receiver_id=eq.${userId}` }, refresh).subscribe()
    return () => { void channel.unsubscribe() }
  }, [userId, refresh])
  return { count, refresh }
}
