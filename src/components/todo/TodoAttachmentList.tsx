import { useEffect, useState } from "react"
import { Download, FileText, Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatAttachmentSize } from "@/lib/chatMedia"
import { getTodoAttachmentUrl } from "@/lib/todoAttachmentService"
import type { TodoAttachment } from "@/types/adminTodo"
import { useI18n } from "@/i18n/useI18n"
import { formatTranslation } from "@/i18n/translate"

function TodoAttachmentItem({ attachment }: { attachment: TodoAttachment }) {
  const { t } = useI18n()
  const [url, setUrl] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [viewerOpen, setViewerOpen] = useState(false)
  useEffect(() => { let active = true; void getTodoAttachmentUrl(attachment.path).then((next) => { if (active) setUrl(next) }).catch(() => { if (active) setError(t("todo.attachmentLoadFailed")) }); return () => { active = false } }, [attachment.path, t])
  if (error) return <p className="text-xs text-destructive">{error}</p>
  if (!url) return <p className="text-xs text-muted-foreground">{t("todo.attachmentLoading")}</p>
  if (attachment.kind === "image") return <><button aria-label={formatTranslation(t("todo.viewImage"), { name: attachment.name })} className="block max-w-full overflow-hidden rounded-2xl border bg-muted/30" onClick={() => setViewerOpen(true)} type="button"><img alt={attachment.name} className="max-h-48 max-w-full object-contain" src={url} /></button><Sheet open={viewerOpen} onOpenChange={setViewerOpen}><SheetContent side="bottom" className="responsive-bottom-sheet max-h-[95dvh] rounded-t-3xl"><SheetHeader><SheetTitle className="truncate pr-8">{attachment.name}</SheetTitle></SheetHeader><div className="min-h-0 overflow-auto px-4 pb-5"><img alt={attachment.name} className="mx-auto max-h-[72dvh] max-w-full rounded-2xl object-contain" src={url} /><a className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary" download={attachment.name} href={url}><Download className="size-4" />{t("todo.downloadImage")}</a></div></SheetContent></Sheet></>
  return <a className="flex min-w-0 items-center gap-3 rounded-2xl border bg-muted/35 p-3" download={attachment.name} href={url}><FileText className="size-7 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="attachment-file-name block text-sm font-semibold">{attachment.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{formatAttachmentSize(attachment.size)}</span></span><Button aria-label={formatTranslation(t("todo.downloadFile"), { name: attachment.name })} size="icon-sm" type="button" variant="ghost"><Download /></Button></a>
}

export function TodoAttachmentList({ attachments }: { attachments: readonly TodoAttachment[] }) {
  const { t } = useI18n()
  if (!attachments.length) return null
  return <div className="mt-3 space-y-2"><p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><ImageIcon className="size-3.5" />{formatTranslation(t("todo.attachments"), { count: attachments.length })}</p>{attachments.map((attachment) => <TodoAttachmentItem attachment={attachment} key={attachment.id} />)}</div>
}
