import { useEffect, useState } from "react"

import { fetchAdminTodoCompletions, fetchAdminTodos } from "@/lib/adminTodoService"
import type { Profile } from "@/types/auth"

export function useAdminTodoBadge(profile: Profile | null, userId: string | undefined): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!profile || !userId) return
    void Promise.all([fetchAdminTodos(), fetchAdminTodoCompletions()]).then(([todos, completions]) => {
      const done = new Set(completions.filter((item) => item.userId === userId && item.completed).map((item) => item.todoId))
      setCount(todos.filter((todo) => !done.has(todo.id)).length)
    }).catch(() => setCount(0))
  }, [profile, userId])
  return count
}
