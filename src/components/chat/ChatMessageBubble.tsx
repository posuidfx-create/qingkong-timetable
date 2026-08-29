import { RoleBadge } from "@/components/profile/RoleBadge"
import { cn } from "@/lib/utils"
import type { AppRole } from "@/types/auth"

export function ChatMessageBubble({ own, username, role, content, createdAt }: { own: boolean; username: string; role?: AppRole; content: string; createdAt: string }) {
  return <article className={cn("max-w-[82%]", own ? "ml-auto" : "mr-auto")}><div className={cn("rounded-[20px] border px-3.5 py-3 shadow-xs", own ? "rounded-br-md border-primary/20 bg-primary/18" : "rounded-bl-md bg-card")}><div className={cn("mb-1.5 flex items-center gap-1.5", own && "justify-end")}><span className="truncate text-xs font-semibold">{own ? "我" : username}</span>{role && role !== "user" && <RoleBadge role={role} />}</div><p className="wrap-anywhere whitespace-pre-wrap text-sm leading-6">{content}</p></div><time className={cn("mt-1 block text-[11px] text-muted-foreground", own ? "text-right" : "text-left")}>{new Date(createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time></article>
}
