import { TriangleAlert } from "lucide-react"

import { type CourseConflictMatch } from "@/lib/conflict"
import { formatConflictMessage } from "@/lib/courseForm"

interface CourseConflictWarningProps {
  conflicts: readonly CourseConflictMatch[]
  disabled: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function CourseConflictWarning({
  conflicts,
  disabled,
  onCancel,
  onConfirm,
}: CourseConflictWarningProps) {
  return (
    <section
      aria-labelledby="course-conflict-title"
      className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-3 text-amber-950 dark:text-amber-100"
    >
      <div className="flex gap-2.5">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0">
          <h3 id="course-conflict-title" className="text-sm font-semibold">
            发现课程冲突
          </h3>
          <ul className="mt-1.5 space-y-1 text-xs leading-5">
            {conflicts.map((conflict) => (
              <li key={conflict.course.id}>{formatConflictMessage(conflict)}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="min-h-11 rounded-xl border border-amber-600/25 bg-background/65 px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          onClick={onCancel}
        >
          返回修改
        </button>
        <button
          type="button"
          className="min-h-11 rounded-xl bg-amber-700 px-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50 dark:bg-amber-500 dark:text-amber-950"
          disabled={disabled}
          onClick={onConfirm}
        >
          仍然保存
        </button>
      </div>
    </section>
  )
}
