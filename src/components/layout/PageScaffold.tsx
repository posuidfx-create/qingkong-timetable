import type { ReactNode } from "react"

interface PageScaffoldProps {
  description: string
  icon: ReactNode
  status: string
  title: string
}

export function PageScaffold({ description, icon, status, title }: PageScaffoldProps) {
  return (
    <section aria-labelledby="page-title" className="mx-auto w-full max-w-md">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 id="page-title" className="mt-4 text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>

      <div className="mt-6 rounded-2xl border bg-card p-4 text-card-foreground shadow-xs">
        <p className="text-sm font-medium">工程基础已就绪</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{status}</p>
      </div>
    </section>
  )
}
