import { useEffect, useState } from "react"
import { Download, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatAttachmentSize } from "@/lib/chatMedia"
import { getChatAttachmentUrl } from "@/lib/chatMediaService"
import type { ChatAttachment as Attachment, ChatMessageType } from "@/types/chat"
import { useI18n } from "@/i18n/useI18n"

export function ChatAttachment({ attachment, type }: { attachment: Attachment; type: Exclude<ChatMessageType, "text"> }) {
  const { t } = useI18n()
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  useEffect(() => { let active = true; void getChatAttachmentUrl(attachment.path).then((nextUrl) => { if (active) setUrl(nextUrl) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : t("chat.attachmentFailed")) }); return () => { active = false } }, [attachment.path, t])
  if (error) return <p className="text-xs text-destructive">{error}</p>
  if (!url) return <p className="py-2 text-xs text-muted-foreground">{t("chat.loadAttachment")}</p>
  if (type === "image") return <><button aria-label={`${t("chat.viewImage")} ${attachment.name}`} className="block max-w-full overflow-hidden rounded-2xl" onClick={() => setViewerOpen(true)} type="button"><img alt={attachment.name} className="max-h-80 max-w-full rounded-2xl object-contain" src={url} /></button><Sheet open={viewerOpen} onOpenChange={setViewerOpen}><SheetContent side="bottom" className="max-h-[95dvh] rounded-t-3xl"><SheetHeader><SheetTitle className="truncate pr-8">{attachment.name}</SheetTitle></SheetHeader><div className="min-h-0 overflow-auto px-4 pb-5"><img alt={attachment.name} className="mx-auto max-h-[72dvh] max-w-full rounded-2xl object-contain" src={url} /><a className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary" download={attachment.name} href={url}><Download className="size-4" />{t("chat.downloadImage")}</a></div></SheetContent></Sheet></>
  if (type === "video") return <video className="max-h-80 max-w-full rounded-2xl bg-black" controls playsInline preload="metadata" src={url} />
  if (type === "audio") return <div className="min-w-[12rem]"><audio className="max-w-full" controls preload="metadata" src={url} /><p className="mt-1 text-[11px] text-muted-foreground">{formatAttachmentSize(attachment.size)}</p></div>
  return <a className="flex min-w-0 items-center gap-3 rounded-2xl bg-muted/55 p-3" download={attachment.name} href={url}><FileText className="size-8 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="attachment-file-name block text-sm font-semibold">{attachment.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{formatAttachmentSize(attachment.size)}</span></span><Button aria-label={`${t("common.download")} ${attachment.name}`} size="icon-sm" type="button" variant="ghost"><Download /></Button></a>
}
