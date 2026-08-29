import type { ReactNode } from "react"

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return <div className="rounded-[22px] border bg-card px-5 py-8 text-center shadow-xs"><div className="kawaii-empty-mark mx-auto flex size-10 items-center justify-center rounded-2xl bg-secondary text-primary">{icon}</div><p className="mt-3 text-sm font-semibold">{title}</p>{description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}{action && <div className="mt-4">{action}</div>}</div>
}
