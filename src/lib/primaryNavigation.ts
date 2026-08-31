import { BookOpen, CalendarDays, ListTodo, MessageCircle, UserRound, type LucideIcon } from "lucide-react"

import type { PrimaryPage } from "@/lib/appNavigation"
import type { TranslationKey } from "@/i18n/translations.zh-CN"

export interface NavigationItem {
  id: Extract<PrimaryPage, "timetable" | "learning" | "chat" | "todo" | "profile">
  label: string
  labelKey: TranslationKey
  icon: LucideIcon
}

export const primaryNavigationItems: readonly NavigationItem[] = [
  { id: "timetable", label: "课程表", labelKey: "nav.timetable", icon: CalendarDays },
  { id: "learning", label: "学习", labelKey: "nav.learning", icon: BookOpen },
  { id: "chat", label: "聊天", labelKey: "nav.chat", icon: MessageCircle },
  { id: "todo", label: "待办", labelKey: "nav.todo", icon: ListTodo },
  { id: "profile", label: "我的", labelKey: "nav.profile", icon: UserRound },
]
