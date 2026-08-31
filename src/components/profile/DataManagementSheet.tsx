import { useRef, useState, type ChangeEvent } from "react"
import { Download, FileJson, Trash2, Upload } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { exportAppData, previewImportedAppData, type ImportPreview, type PersistedAppState } from "@/lib/storage"
import { useI18n } from "@/i18n/useI18n"

interface DataManagementSheetProps {
  open: boolean
  state: PersistedAppState
  onOpenChange: (open: boolean) => void
  onRestore: (preview: ImportPreview) => boolean
  onClearAll: () => boolean
}

function getBackupFileName(): string {
  return `timetable-backup-${new Date().toISOString().slice(0, 10)}.json`
}

function downloadBackup(state: PersistedAppState) {
  const blob = new Blob([exportAppData(state)], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = getBackupFileName()
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function DataManagementSheet({
  open,
  state,
  onOpenChange,
  onRestore,
  onClearAll,
}: DataManagementSheetProps) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImportPreview>()
  const [readError, setReadError] = useState<string>()

  function resetPreview() {
    setPreview(undefined)
    setReadError(undefined)
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    resetPreview()
    if (!file) return

    try {
      setPreview(previewImportedAppData(await file.text()))
    } catch {
      setReadError(t("profile.readBackupFailed"))
    }
  }

  function handleRestore() {
    if (!preview || !onRestore(preview)) {
      setReadError(t("profile.restoreFailed"))
      return
    }
    resetPreview()
    onOpenChange(false)
  }

  function handleClearAll() {
    if (!onClearAll()) {
      setReadError(t("profile.clearFailed"))
      return
    }
    resetPreview()
    onOpenChange(false)
  }

  const imported = preview?.state

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { onOpenChange(nextOpen); if (!nextOpen) resetPreview() }}>
      <SheetContent side="bottom" className="responsive-bottom-sheet max-h-[90dvh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>{t("profile.data")}</SheetTitle>
          <SheetDescription>{t("profile.dataDescription")}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
          <Button className="min-h-11 w-full justify-start gap-3" variant="secondary" onClick={() => downloadBackup(state)}>
            <Download className="size-4" />{t("profile.export")}
          </Button>
          <Button className="min-h-11 w-full justify-start gap-3" variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" />{t("profile.restoreJson")}
          </Button>
          <input ref={inputRef} accept="application/json,.json" aria-label={t("profile.chooseBackup")} className="sr-only" type="file" onChange={handleFileChange} />

          {readError ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{readError}</p> : null}
          {preview && !preview.valid ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert"><p className="font-semibold">{t("profile.invalidBackup")}</p><p className="mt-1">{preview.errors.join("；") || t("profile.invalidBackupFormat")}</p></div> : null}
          {imported ? <div className="rounded-2xl border bg-muted/45 p-3 text-sm"><div className="flex items-center gap-2 font-semibold"><FileJson className="size-4 text-primary" />{t("profile.backupPreview")}</div><dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-muted-foreground"><dt>{t("profile.courses")}</dt><dd className="text-right text-foreground">{imported.courses.length} {t("profile.items")}</dd><dt>Todo</dt><dd className="text-right text-foreground">{imported.todos.length} {t("profile.items")}</dd><dt>{t("profile.semester")}</dt><dd className="truncate text-right text-foreground">{imported.semester.name}</dd><dt>{t("profile.backupVersion")}</dt><dd className="text-right text-foreground">v{imported.schemaVersion}</dd></dl>{preview.warnings.length > 0 ? <p className="mt-3 text-xs text-muted-foreground">{preview.warnings.join("；")}</p> : null}<AlertDialog><AlertDialogTrigger asChild><Button className="mt-4 min-h-11 w-full">{t("profile.restoreBackup")}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("profile.restoreConfirm")}</AlertDialogTitle><AlertDialogDescription>{t("profile.restoreConfirmDescription")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={handleRestore}>{t("profile.restoreConfirmAction")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div> : null}

          <div className="border-t pt-3"><AlertDialog><AlertDialogTrigger asChild><Button className="min-h-11 w-full justify-start gap-3" variant="destructive"><Trash2 className="size-4" />{t("profile.clearAll")}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("profile.clearConfirm")}</AlertDialogTitle><AlertDialogDescription>{t("profile.clearConfirmDescription")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={handleClearAll}>{t("profile.clearConfirmAction")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
