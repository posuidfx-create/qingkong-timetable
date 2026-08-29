import { RoleBadge } from "@/components/profile/RoleBadge"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { cn } from "@/lib/utils"
import type { AppRole } from "@/types/auth"

interface ChatMessageBubbleProps {
  content: string
  createdAt: string
  own: boolean
  role?: AppRole
  senderId: string
  showSender: boolean
  username: string
}

export function ChatMessageBubble({ own, username, role, content, createdAt, senderId, showSender }: ChatMessageBubbleProps) {
  return <article className={cn("flex max-w-[82%] gap-2 md:max-w-[70%]", own ? "ml-auto flex-row-reverse" : "mr-auto")}>
    {!own && <div className="w-9 shrink-0">{showSender && <UserAvatar id={senderId} name={username} className="size-8 rounded-xl text-xs" />}</div>}
    <div className="min-w-0 flex-1"><div className={cn("rounded-[20px] border px-3.5 py-3 shadow-xs", own ? "rounded-br-md border-primary/20 bg-primary/18" : "rounded-bl-md bg-card")}>
      {showSender && <div className={cn("mb-1.5 flex items-center gap-1.5", own && "justify-end")}><span className="truncate text-xs font-semibold">{own ? "我" : username}</span>{role && role !== "user" && <RoleBadge role={role} />}</div>}
      <p className="wrap-anywhere whitespace-pre-wrap text-sm leading-6">{content}</p>
    </div><time className={cn("mt-1 block text-[11px] text-muted-foreground/80", own ? "text-right" : "text-left")}>{new Date(createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time></div>
  </article>
}
