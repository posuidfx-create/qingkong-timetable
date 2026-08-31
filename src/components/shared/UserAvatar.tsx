import { cn } from "@/lib/utils"

const avatarColors = ["bg-rose-100 text-rose-800", "bg-sky-100 text-sky-800", "bg-amber-100 text-amber-800", "bg-emerald-100 text-emerald-800", "bg-violet-100 text-violet-800"]
function stableIndex(value: string): number { return [...value].reduce((sum, character) => sum + (character.codePointAt(0) ?? 0), 0) % avatarColors.length }

export function UserAvatar({ id, name, className }: { id: string; name: string; className?: string }) {
  return <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold", avatarColors[stableIndex(id)], className)}>{name.trim().slice(0, 1) || "·"}</span>
}
