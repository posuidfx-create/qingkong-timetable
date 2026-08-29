import { CalendarClock, Check, Circle, Link2, MoreHorizontal, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatTodoDueDate, isTodoOverdue } from "@/lib/todo"
import { cn } from "@/lib/utils"
import type { Todo } from "@/types/timetable"

interface TodoCardProps {
  courseName?: string
  now: Date
  onDelete: (todo: Todo) => void
  onEdit: (todo: Todo) => void
  onToggle: (todo: Todo) => void
  todo: Todo
}

const typeLabels = { assignment: "作业", exam: "考试", course: "课程任务", other: "其他" } as const

export function TodoCard({ courseName, now, onDelete, onEdit, onToggle, todo }: TodoCardProps) {
  const dueText = formatTodoDueDate(todo.dueAt, now)
  const overdue = isTodoOverdue(todo, now)
  return (
    <article className={cn("flex gap-3 rounded-[18px] border bg-card p-3 shadow-xs", todo.completed && "opacity-60")}>
      <button type="button" aria-label={todo.completed ? `恢复待办：${todo.title}` : `完成待办：${todo.title}`} className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border bg-secondary/55 text-primary transition-transform duration-150 active:scale-95" onClick={() => onToggle(todo)}>
        {todo.completed ? <Check aria-hidden="true" className="size-4" /> : <Circle aria-hidden="true" className="size-4" />}
      </button>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEdit(todo)}>
        <div className="flex items-start justify-between gap-2"><h3 className={cn("line-clamp-2 text-sm font-semibold leading-5", todo.completed && "line-through")}>{todo.title}</h3><span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">{typeLabels[todo.type]}</span></div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {dueText ? <span className={cn("inline-flex items-center gap-1", overdue && "text-destructive")}><CalendarClock aria-hidden="true" className="size-3.5" />{overdue ? "已逾期 · " : ""}{dueText}</span> : null}
          {courseName ? <span className="inline-flex items-center gap-1"><Link2 aria-hidden="true" className="size-3.5" />{courseName}</span> : null}
        </div>
        {todo.note ? <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{todo.note}</p> : null}
      </button>
      <AlertDialog>
        <AlertDialogTrigger asChild><button type="button" aria-label={`删除待办：${todo.title}`} className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground"><MoreHorizontal aria-hidden="true" className="size-4" /></button></AlertDialogTrigger>
        <AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>删除“{todo.title}”吗？</AlertDialogTitle><AlertDialogDescription>删除后无法恢复。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="min-h-11">取消</AlertDialogCancel><AlertDialogAction variant="destructive" className="min-h-11" onClick={() => onDelete(todo)}><Trash2 aria-hidden="true" className="size-4" />删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </article>
  )
}
