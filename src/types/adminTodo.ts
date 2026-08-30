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
  attachments?: TodoAttachment[]
}

export interface TodoAttachment {
  id: string
  todoId: string
  uploaderId: string
  path: string
  name: string
  mime: string
  size: number
  kind: "image" | "file"
  createdAt: string
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
  attachments: File[]
  removedAttachmentIds: string[]
}
