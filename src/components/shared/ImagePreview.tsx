import { useCallback, useEffect, useState } from "react"
import { Download, ImageOff, RotateCw, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useI18n } from "@/i18n/useI18n"

interface ImagePreviewProps {
  alt: string
  className?: string
  loadUrl: (forceRefresh?: boolean) => Promise<string>
  showDownload?: boolean
}

export function ImagePreview({ alt, className = "", loadUrl, showDownload = true }: ImagePreviewProps) {
  const { t } = useI18n()
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    void loadUrl(reloadKey > 0).then((next) => { if (active) setUrl(next) }).catch(() => { if (active) { setUrl(null); setError(true) } })
    return () => { active = false }
  }, [loadUrl, reloadKey])

  const retry = useCallback(() => { setError(false); setUrl(null); setReloadKey((value) => value + 1) }, [])
  if (error) return <div className="flex min-h-28 flex-col items-center justify-center gap-2 border border-dashed border-border bg-muted/35 p-4 text-center"><ImageOff className="size-5 text-muted-foreground" /><p className="text-xs text-muted-foreground">{t("media.previewFailed")}</p><Button onClick={retry} size="sm" variant="ghost"><RotateCw className="size-3.5" />{t("media.reload")}</Button></div>
  if (!url) return <div aria-label={t("media.loading")} className="min-h-28 animate-pulse bg-muted/55 motion-reduce:animate-none" role="status" />

  return <>
    <button aria-label={`${t("media.viewImage")} ${alt}`} className={`block max-w-full overflow-hidden text-left ${className}`} onClick={() => setViewerOpen(true)} type="button">
      <img alt={alt} className="h-full w-full object-cover" loading="lazy" onError={() => setError(true)} src={url} />
    </button>
    <Sheet onOpenChange={setViewerOpen} open={viewerOpen}><SheetContent className="flex max-h-[100dvh] flex-col rounded-none p-0 sm:max-h-[95dvh] sm:rounded-t-3xl" side="bottom"><SheetHeader className="flex-row items-center justify-between border-b px-4 py-3 [padding-top:max(0.75rem,env(safe-area-inset-top))]"><SheetTitle className="min-w-0 flex-1 truncate pr-3">{alt}</SheetTitle><Button aria-label={t("common.close")} onClick={() => setViewerOpen(false)} size="icon-sm" variant="ghost"><X /></Button></SheetHeader><div className="min-h-0 flex-1 overflow-auto bg-black/95 p-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]"><img alt={alt} className="mx-auto max-h-[82dvh] max-w-full object-contain" onError={() => setError(true)} src={url} />{showDownload ? <a className="mx-auto mt-3 flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-white" download={alt} href={url}><Download className="size-4" />{t("common.download")}</a> : null}</div></SheetContent></Sheet>
  </>
}
