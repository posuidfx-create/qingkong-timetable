import { format, isSameDay, isValid, parseISO } from "date-fns"

import type { Todo } from "@/types/timetable"
import type { AppLocale } from "@/i18n/locale"
import { translate } from "@/i18n/translate"

function parseTodoDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : undefined
}

export function isTodoOverdue(todo: Todo, now: Date): boolean {
  const dueDate = parseTodoDate(todo.dueAt)
  return !todo.completed && dueDate !== undefined && dueDate.getTime() < now.getTime()
}

export function getTodayTodos(todos: readonly Todo[], now: Date): Todo[] {
  return todos.filter((todo) => {
    const dueDate = parseTodoDate(todo.dueAt)
    return !todo.completed && dueDate !== undefined && isSameDay(dueDate, now)
  })
}

export function sortTodos(todos: readonly Todo[]): Todo[] {
  return todos
    .map((todo, index) => ({ todo, index, dueDate: parseTodoDate(todo.dueAt) }))
    .sort((left, right) => {
      if (left.todo.completed !== right.todo.completed) return left.todo.completed ? 1 : -1
      if (left.dueDate && right.dueDate) return left.dueDate.getTime() - right.dueDate.getTime()
      if (left.dueDate) return -1
      if (right.dueDate) return 1
      return left.index - right.index
    })
    .map(({ todo }) => todo)
}

export function formatTodoDueDate(dueAt: string | undefined, now: Date, locale: AppLocale = "zh-CN"): string | undefined {
  const dueDate = parseTodoDate(dueAt)
  if (!dueDate) return undefined

  if (isSameDay(dueDate, now)) return `${translate(locale, "date.today")} ${format(dueDate, "HH:mm")}`
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isSameDay(dueDate, tomorrow)) return `${translate(locale, "date.tomorrow")} ${format(dueDate, "HH:mm")}`
  if (locale === "zh-CN") {
    return format(dueDate, dueDate.getFullYear() === now.getFullYear() ? "M月d日 HH:mm" : "yyyy年M月d日 HH:mm")
  }
  return new Intl.DateTimeFormat(locale, {
    ...(dueDate.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dueDate)
}
