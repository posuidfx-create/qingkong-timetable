import type { ProfileCohortYear } from "@/types/auth"

export type AdminTodoTargetType = "all" | "cohort" | "users"

export interface AdminTodo {
  id: string
  title: string
  description: string | null
  targetType: AdminTodoTargetType
  targetCohort: ProfileCohortYear | null
  createdBy: string
  dueAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminTodoCompletion {
  todoId: string
  userId: string
  completed: boolean
  completedAt: string | null
}

export interface AdminTodoDraft {
  title: string
  description: string | null
  dueAt: string | null
  targetType: AdminTodoTargetType
  targetCohort: ProfileCohortYear | null
  userIds: string[]
}
