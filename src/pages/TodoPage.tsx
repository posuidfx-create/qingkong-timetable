import { useMemo, useState } from "react"
import { ListTodo, Plus } from "lucide-react"

import { TodoCard } from "@/components/todo/TodoCard"
import { TodoFormSheet } from "@/components/todo/TodoFormSheet"
import { sortTodos } from "@/lib/todo"
import { useTimetableStore } from "@/store/timetableStore"
import type { Todo } from "@/types/timetable"

type TodoOverlay = { mode: "create"; key: string } | { mode: "edit"; todo: Todo; key: string }

let todoFormSession = 0

function getTodoFormKey(mode: "create" | "edit", todoId?: string): string {
  todoFormSession += 1
  return `${mode}-${todoId ?? "new"}-${todoFormSession}`
}

export function TodoPage() {
  const todos = useTimetableStore((state) => state.todos)
  const courses = useTimetableStore((state) => state.courses)
  const addTodo = useTimetableStore((state) => state.addTodo)
  const updateTodo = useTimetableStore((state) => state.updateTodo)
  const deleteTodo = useTimetableStore((state) => state.deleteTodo)
  const toggleTodo = useTimetableStore((state) => state.toggleTodo)
  const [overlay, setOverlay] = useState<TodoOverlay>()
  const now = useMemo(() => new Date(), [])
  const sortedTodos = useMemo(() => sortTodos(todos), [todos])
  const remainingCount = todos.filter((todo) => !todo.completed).length
  const courseNames = useMemo(() => new Map(courses.map((course) => [course.id, course.name])), [courses])

  function handleSave(todo: Todo) {
    if (overlay?.mode === "edit") {
      const { id, ...updates } = todo
      updateTodo(id, updates)
    } else {
      addTodo(todo)
    }
    setOverlay(undefined)
  }

  return (
    <section aria-labelledby="todo-page-title" className="mx-auto w-full max-w-md pb-18">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <ListTodo aria-hidden="true" className="size-5" />
      </div>
      <h2 id="todo-page-title" className="mt-3 text-2xl font-semibold tracking-tight">待办</h2>
      <p className="mt-1 text-sm text-muted-foreground">未完成 {remainingCount} 项</p>

      {sortedTodos.length === 0 ? (
        <div className="mt-8 rounded-2xl border bg-card px-5 py-10 text-center shadow-xs">
          <p className="text-sm font-semibold">还没有待办</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">把作业、考试和课程任务集中记录在这里。</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2.5">
          {sortedTodos.map((todo) => <TodoCard key={todo.id} todo={todo} now={now} courseName={todo.courseId ? courseNames.get(todo.courseId) : undefined} onToggle={(item) => toggleTodo(item.id)} onEdit={(item) => setOverlay({ mode: "edit", todo: item, key: getTodoFormKey("edit", item.id) })} onDelete={(item) => deleteTodo(item.id)} />)}
        </div>
      )}

      <button type="button" aria-label="新增待办" className="todo-fab flex size-14 touch-manipulation items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={() => setOverlay({ mode: "create", key: getTodoFormKey("create") })}><Plus aria-hidden="true" className="size-6" strokeWidth={2.4} /></button>

      {overlay ? <TodoFormSheet key={overlay.key} open courses={courses} todo={overlay.mode === "edit" ? overlay.todo : undefined} onOpenChange={(open) => { if (!open) setOverlay(undefined) }} onSave={handleSave} /> : null}
    </section>
  )
}
