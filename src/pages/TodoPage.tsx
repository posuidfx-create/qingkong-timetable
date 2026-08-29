import { useCallback, useEffect, useMemo, useState } from "react"
import { ListTodo, Plus } from "lucide-react"

import { AdminTodoCard } from "@/components/todo/AdminTodoCard"
import { AdminTodoFormSheet } from "@/components/todo/AdminTodoFormSheet"
import { TodoCard } from "@/components/todo/TodoCard"
import { TodoFormSheet } from "@/components/todo/TodoFormSheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getVisibleCourses } from "@/data/builtinTimetables"
import { canManageAdminTodos, getVisibleAdminTodoTabs, sortAdminTodos } from "@/lib/adminTodo"
import { deleteAdminTodo, fetchAdminTodoCompletions, fetchAdminTodos, saveAdminTodo, toggleAdminTodoCompletion } from "@/lib/adminTodoService"
import { sortTodos } from "@/lib/todo"
import { useAuthStore } from "@/store/authStore"
import { useTimetableStore } from "@/store/timetableStore"
import type { AdminTodo, AdminTodoDraft } from "@/types/adminTodo"
import type { Todo } from "@/types/timetable"

type LocalOverlay = { mode: "create" } | { mode: "edit"; todo: Todo }

export function TodoPage() {
  const profile = useAuthStore((state) => state.profile)
  const user = useAuthStore((state) => state.user)
  const todos = useTimetableStore((state) => state.todos)
  const userCourses = useTimetableStore((state) => state.courses)
  const cohortYear = useTimetableStore((state) => state.settings.cohortYear)
  const addTodo = useTimetableStore((state) => state.addTodo)
  const updateTodo = useTimetableStore((state) => state.updateTodo)
  const deleteTodo = useTimetableStore((state) => state.deleteTodo)
  const toggleTodo = useTimetableStore((state) => state.toggleTodo)
  const [localOverlay, setLocalOverlay] = useState<LocalOverlay>()
  const [adminOverlay, setAdminOverlay] = useState<AdminTodo | "create">()
  const [adminTodos, setAdminTodos] = useState<AdminTodo[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const now = useMemo(() => new Date(), [])
  const courses = useMemo(() => getVisibleCourses(cohortYear, userCourses), [cohortYear, userCourses])
  const courseNames = useMemo(() => new Map(courses.map((course) => [course.id, course.name])), [courses])
  const localTodos = useMemo(() => sortTodos(todos), [todos])
  const canManage = canManageAdminTodos(profile)
  const tabs: Array<"mine" | "cohort_2024" | "cohort_2025"> = profile ? getVisibleAdminTodoTabs(profile) : ["mine"]

  const refreshAdminTodos = useCallback(() => {
    void Promise.all([fetchAdminTodos(), fetchAdminTodoCompletions()])
      .then(([items, completions]) => {
        setAdminTodos(items)
        setCompletedIds(new Set(completions.filter((item) => item.userId === user?.id && item.completed).map((item) => item.todoId)))
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "管理员待办暂不可用。"))
  }, [user?.id])
  useEffect(() => { if (profile) refreshAdminTodos() }, [profile, refreshAdminTodos])
  if (!profile || !user) return <p className="text-sm text-muted-foreground">正在读取待办资料…</p>

  const visibleAdminTodos = (tab: "mine" | "cohort_2024" | "cohort_2025") => sortAdminTodos(adminTodos.filter((todo) => tab === "mine" ? todo.targetType !== "cohort" : todo.targetType === "cohort" && todo.targetCohort === (tab === "cohort_2024" ? 2024 : 2025)))
  const saveLocal = (todo: Todo) => { if (localOverlay?.mode === "edit") { const { id, ...updates } = todo; updateTodo(id, updates) } else addTodo(todo); setLocalOverlay(undefined) }
  const saveAdmin = async (draft: AdminTodoDraft) => { const saved = await saveAdminTodo(draft, adminOverlay !== "create" ? adminOverlay?.id : undefined); setAdminTodos((items) => [saved, ...items.filter((item) => item.id !== saved.id)]) }
  const toggleAdmin = async (todo: AdminTodo) => { try { await toggleAdminTodoCompletion(todo.id, !completedIds.has(todo.id)); setCompletedIds((ids) => { const next = new Set(ids); if (next.has(todo.id)) next.delete(todo.id); else next.add(todo.id); return next }) } catch (reason) { setError(reason instanceof Error ? reason.message : "无法更新完成状态。") } }
  const removeAdmin = async (todo: AdminTodo) => { try { await deleteAdminTodo(todo.id); setAdminTodos((items) => items.filter((item) => item.id !== todo.id)) } catch (reason) { setError(reason instanceof Error ? reason.message : "无法删除待办。") } }

  return <section aria-labelledby="todo-page-title" className="mx-auto w-full max-w-md pb-18 md:max-w-6xl"><div className="flex items-center justify-between gap-3"><div><div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ListTodo className="size-5" /></div><h2 id="todo-page-title" className="mt-3 text-2xl font-semibold tracking-tight">待办</h2><p className="mt-1 text-sm text-muted-foreground">个人记录与管理员发布分开保存。</p></div>{canManage ? <button aria-label="发布待办" className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm" onClick={() => setAdminOverlay("create")} type="button"><Plus className="size-5" /><span className="hidden md:inline">发布待办</span></button> : <button aria-label="新增个人待办" className="hidden min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm md:flex" onClick={() => setLocalOverlay({ mode: "create" })} type="button"><Plus className="size-5" />新增待办</button>}</div><Tabs className="mt-5" defaultValue="mine"><TabsList className="w-full md:max-w-md"><TabsTrigger value="mine">我的</TabsTrigger>{tabs.includes("cohort_2024") && <TabsTrigger value="cohort_2024">24级</TabsTrigger>}{tabs.includes("cohort_2025") && <TabsTrigger value="cohort_2025">25级</TabsTrigger>}</TabsList>{tabs.map((tab) => <TabsContent key={tab} value={tab}><div className="mt-4 space-y-5">{tab === "mine" && <section><h3 className="text-sm font-semibold">个人待办</h3><div className="mt-2 grid gap-2.5 md:grid-cols-2">{localTodos.map((todo) => <TodoCard key={todo.id} courseName={todo.courseId ? courseNames.get(todo.courseId) : undefined} now={now} onDelete={(item) => deleteTodo(item.id)} onEdit={(item) => setLocalOverlay({ mode: "edit", todo: item })} onToggle={(item) => toggleTodo(item.id)} todo={todo} />)}{localTodos.length === 0 && <p className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground md:col-span-2">还没有个人待办。</p>}</div></section>}<section><h3 className="text-sm font-semibold">管理员发布</h3><div className="mt-2 grid gap-2.5 md:grid-cols-2">{visibleAdminTodos(tab).map((todo) => <AdminTodoCard canManage={canManage} completed={completedIds.has(todo.id)} key={todo.id} onDelete={() => void removeAdmin(todo)} onEdit={() => setAdminOverlay(todo)} onToggle={() => void toggleAdmin(todo)} todo={todo} />)}{visibleAdminTodos(tab).length === 0 && <p className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground md:col-span-2">暂时没有这个范围的管理员待办。</p>}</div></section></div></TabsContent>)}</Tabs>{error && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}<button aria-label="新增个人待办" className="todo-fab flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg md:hidden" onClick={() => setLocalOverlay({ mode: "create" })} type="button"><Plus className="size-6" /></button>{localOverlay && <TodoFormSheet courses={courses} onOpenChange={(open) => { if (!open) setLocalOverlay(undefined) }} onSave={saveLocal} open todo={localOverlay.mode === "edit" ? localOverlay.todo : undefined} />}{adminOverlay && <AdminTodoFormSheet onOpenChange={(open) => { if (!open) setAdminOverlay(undefined) }} onSave={saveAdmin} open todo={adminOverlay === "create" ? undefined : adminOverlay} />}</section>
}
