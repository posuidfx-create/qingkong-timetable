import { useEffect, useState } from "react"
import { Download, FileText, Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatAttachmentSize } from "@/lib/chatMedia"
import { getTodoAttachmentUrl } from "@/lib/todoAttachmentService"
import type { TodoAttachment } from "@/types/adminTodo"

function TodoAttachmentItem({ attachment }: { attachment: TodoAttachment }) {
  const [url, setUrl] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [viewerOpen, setViewerOpen] = useState(false)
  useEffect(() => { let active = true; void getTodoAttachmentUrl(attachment.path).then((next) => { if (active) setUrl(next) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "附件加载失败。") }); return () => { active = false } }, [attachment.path])
  if (error) return <p className="text-xs text-destructive">{error}</p>
  if (!url) return <p className="text-xs text-muted-foreground">正在加载附件…</p>
  if (attachment.kind === "image") return <><button aria-label={`查看图片 ${attachment.name}`} className="block max-w-full overflow-hidden rounded-2xl border bg-muted/30" onClick={() => setViewerOpen(true)} type="button"><img alt={attachment.name} className="max-h-48 max-w-full object-contain" src={url} /></button><Sheet open={viewerOpen} onOpenChange={setViewerOpen}><SheetContent side="bottom" className="responsive-bottom-sheet max-h-[95dvh] rounded-t-3xl"><SheetHeader><SheetTitle className="truncate pr-8">{attachment.name}</SheetTitle></SheetHeader><div className="min-h-0 overflow-auto px-4 pb-5"><img alt={attachment.name} className="mx-auto max-h-[72dvh] max-w-full rounded-2xl object-contain" src={url} /><a className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary" download={attachment.name} href={url}><Download className="size-4" />下载图片</a></div></SheetContent></Sheet></>
  return <a className="flex min-w-0 items-center gap-3 rounded-2xl border bg-muted/35 p-3" download={attachment.name} href={url}><FileText className="size-7 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{attachment.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{formatAttachmentSize(attachment.size)}</span></span><Button aria-label={`下载 ${attachment.name}`} size="icon-sm" type="button" variant="ghost"><Download /></Button></a>
}

export function TodoAttachmentList({ attachments }: { attachments: readonly TodoAttachment[] }) {
  if (!attachments.length) return null
  return <div className="mt-3 space-y-2"><p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><ImageIcon className="size-3.5" />附件（{attachments.length}）</p>{attachments.map((attachment) => <TodoAttachmentItem attachment={attachment} key={attachment.id} />)}</div>
}
