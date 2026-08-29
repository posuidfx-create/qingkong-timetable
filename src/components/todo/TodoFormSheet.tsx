import { useState, type FormEvent } from "react"
import { format, isValid, parseISO } from "date-fns"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { createUniqueId } from "@/lib/id"
import type { Course, Todo, TodoType } from "@/types/timetable"

interface TodoFormSheetProps {
  courses: readonly Course[]
  onOpenChange: (open: boolean) => void
  onSave: (todo: Todo) => void
  open: boolean
  todo?: Todo
}

const todoTypes: readonly { value: TodoType; label: string }[] = [
  { value: "assignment", label: "作业" },
  { value: "exam", label: "考试" },
  { value: "course", label: "课程任务" },
  { value: "other", label: "其他" },
]

function toLocalDateTime(value: string | undefined): string {
  if (!value) return ""
  const parsed = parseISO(value)
  return isValid(parsed) ? format(parsed, "yyyy-MM-dd'T'HH:mm") : ""
}

export function TodoFormSheet({ courses, onOpenChange, onSave, open, todo }: TodoFormSheetProps) {
  const [title, setTitle] = useState(todo?.title ?? "")
  const [type, setType] = useState<TodoType>(todo?.type ?? "assignment")
  const initialCourseId = todo?.courseId && courses.some((course) => course.id === todo.courseId)
    ? todo.courseId
    : "none"
  const [courseId, setCourseId] = useState(initialCourseId)
  const [dueAt, setDueAt] = useState(toLocalDateTime(todo?.dueAt))
  const [note, setNote] = useState(todo?.note ?? "")
  const [error, setError] = useState<string>()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      setError("请输入待办标题")
      return
    }
    const dueDate = dueAt ? new Date(dueAt) : undefined
    if (dueDate && !isValid(dueDate)) {
      setError("请选择有效的截止时间")
      return
    }
    onSave({
      id: todo?.id ?? createUniqueId(),
      title: normalizedTitle,
      type,
      completed: todo?.completed ?? false,
      ...(courseId !== "none" ? { courseId } : {}),
      ...(dueDate ? { dueAt: dueDate.toISOString() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      createdAt: todo?.createdAt ?? new Date().toISOString(),
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="responsive-bottom-sheet max-h-[92dvh] gap-0 overflow-hidden rounded-t-3xl border-x sm:bottom-4 sm:w-[min(34rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:rounded-3xl sm:border"
      >
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/25" />
        <SheetHeader className="pr-14 pb-3">
          <SheetTitle className="text-xl font-semibold">{todo ? "编辑待办" : "新增待办"}</SheetTitle>
          <SheetDescription>整理学习任务，所有内容仅保存在当前设备。</SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-5">
            <div>
              <Label htmlFor="todo-title">标题 *</Label>
              <Input
                id="todo-title"
                autoFocus
                className="mt-2 h-11"
                maxLength={120}
                value={title}
                onChange={(event) => { setTitle(event.target.value); setError(undefined) }}
              />
              {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>类型 *</Label>
                <Select value={type} onValueChange={(value) => setType(value as TodoType)}>
                  <SelectTrigger aria-label="待办类型" className="mt-2 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">
                    {todoTypes.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>关联课程</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger aria-label="关联课程" className="mt-2 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="none">不关联课程</SelectItem>
                    {courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="todo-due-at">截止时间</Label>
              <Input id="todo-due-at" className="mt-2 h-11" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
              <p className="mt-1.5 text-xs text-muted-foreground">留空表示暂不设置截止时间。</p>
            </div>
            <div>
              <Label htmlFor="todo-note">备注</Label>
              <Textarea id="todo-note" className="mt-2" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t bg-popover px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="button" className="min-h-11 rounded-xl border bg-background text-sm font-medium" onClick={() => onOpenChange(false)}>取消</button>
            <button type="submit" className="min-h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground">{todo ? "保存修改" : "保存待办"}</button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
