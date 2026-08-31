import { Check, Circle, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getAdminTodoTargetLabel } from "@/lib/adminTodo"
import { TodoAttachmentList } from "@/components/todo/TodoAttachmentList"
import type { AdminTodo } from "@/types/adminTodo"
import { useI18n } from "@/i18n/useI18n"

export function AdminTodoCard({ todo, completed, canManage, onToggle, onEdit, onDelete }: { todo: AdminTodo; completed: boolean; canManage: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const { locale, t } = useI18n()
  return <article className="flex gap-3 rounded-[20px] border bg-card p-3 shadow-xs"><button aria-label={`${t(completed ? "todo.restore" : "todo.complete")}：${todo.title}`} className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border bg-secondary/55 text-primary" onClick={onToggle} type="button">{completed ? <Check className="size-4" /> : <Circle className="size-4" />}</button><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className={completed ? "line-clamp-2 text-sm font-semibold leading-5 line-through opacity-60" : "line-clamp-2 text-sm font-semibold leading-5"}>{todo.title}</h3><span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{t("todo.adminPublish")}</span></div>{todo.description && <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{todo.description}</p>}<p className="mt-2 text-xs text-muted-foreground">{getAdminTodoTargetLabel(todo.targetType, todo.targetCohort, locale)}{todo.dueAt ? ` · ${t("todo.deadline")} ${new Date(todo.dueAt).toLocaleString(locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}</p><TodoAttachmentList attachments={todo.attachments ?? []} /></div>{canManage && <div className="flex shrink-0 flex-col gap-1"><Button aria-label={t("todo.editPublished")} onClick={onEdit} size="icon-xs" variant="ghost"><Pencil /></Button><Button aria-label={t("common.delete")} onClick={onDelete} size="icon-xs" variant="ghost"><Trash2 /></Button></div>}</article>
}
