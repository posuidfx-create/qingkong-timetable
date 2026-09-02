import { useCallback, useEffect, useState } from "react"
import { Download, FileText } from "lucide-react"

import { ImagePreview } from "@/components/shared/ImagePreview"
import { Button } from "@/components/ui/button"
import { formatAttachmentSize } from "@/lib/chatMedia"
import { getChatAttachmentUrl } from "@/lib/chatMediaService"
import type { ChatAttachment as Attachment, ChatMessageType } from "@/types/chat"
import { useI18n } from "@/i18n/useI18n"

export function ChatAttachment({ attachment, type }: { attachment: Attachment; type: Exclude<ChatMessageType, "text"> }) {
  const { t } = useI18n()
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const loadImageUrl = useCallback((forceRefresh = false) => getChatAttachmentUrl(attachment.path, forceRefresh), [attachment.path])
  useEffect(() => { if (type === "image") return; let active = true; void getChatAttachmentUrl(attachment.path).then((nextUrl) => { if (active) setUrl(nextUrl) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : t("chat.attachmentFailed")) }); return () => { active = false } }, [attachment.path, t, type])
  if (type === "image") return <div className="max-w-full overflow-hidden"><ImagePreview alt={attachment.name} className="aspect-[4/3] max-h-80 w-full min-w-[12rem]" loadUrl={loadImageUrl} /><p className="mt-1 max-w-full truncate text-[11px] text-muted-foreground">{attachment.name} · {formatAttachmentSize(attachment.size)}</p></div>
  if (error) return <p className="text-xs text-destructive">{error}</p>
  if (!url) return <p className="py-2 text-xs text-muted-foreground">{t("chat.loadAttachment")}</p>
  if (type === "video") return <video className="max-h-80 max-w-full rounded-2xl bg-black" controls playsInline preload="metadata" src={url} />
  if (type === "audio") return <div className="min-w-[12rem]"><audio className="max-w-full" controls preload="metadata" src={url} /><p className="mt-1 text-[11px] text-muted-foreground">{formatAttachmentSize(attachment.size)}</p></div>
  return <a className="flex min-w-0 items-center gap-3 rounded-2xl bg-muted/55 p-3" download={attachment.name} href={url}><FileText className="size-8 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="attachment-file-name block text-sm font-semibold">{attachment.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{formatAttachmentSize(attachment.size)}</span></span><Button aria-label={`${t("common.download")} ${attachment.name}`} size="icon-sm" type="button" variant="ghost"><Download /></Button></a>
}
