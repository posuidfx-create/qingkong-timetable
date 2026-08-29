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
      setReadError("无法读取该备份文件，请重新选择 JSON 文件。")
    }
  }

  function handleRestore() {
    if (!preview || !onRestore(preview)) {
      setReadError("恢复失败，当前数据没有被修改。")
      return
    }
    resetPreview()
    onOpenChange(false)
  }

  function handleClearAll() {
    if (!onClearAll()) {
      setReadError("无法清除本地数据；当前页面数据未被修改。")
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
          <SheetTitle>数据备份与恢复</SheetTitle>
          <SheetDescription>备份仅保存在你的设备上，恢复前会先验证数据。</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
          <Button className="min-h-11 w-full justify-start gap-3" variant="secondary" onClick={() => downloadBackup(state)}>
            <Download className="size-4" />导出数据
          </Button>
          <Button className="min-h-11 w-full justify-start gap-3" variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" />从 JSON 恢复
          </Button>
          <input ref={inputRef} accept="application/json,.json" aria-label="选择 JSON 备份文件" className="sr-only" type="file" onChange={handleFileChange} />

          {readError ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{readError}</p> : null}
          {preview && !preview.valid ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert"><p className="font-semibold">无法使用此备份</p><p className="mt-1">{preview.errors.join("；") || "备份格式不正确。"}</p></div> : null}
          {imported ? <div className="rounded-2xl border bg-muted/45 p-3 text-sm"><div className="flex items-center gap-2 font-semibold"><FileJson className="size-4 text-primary" />备份预览</div><dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-muted-foreground"><dt>课程</dt><dd className="text-right text-foreground">{imported.courses.length} 项</dd><dt>Todo</dt><dd className="text-right text-foreground">{imported.todos.length} 项</dd><dt>学期</dt><dd className="truncate text-right text-foreground">{imported.semester.name}</dd><dt>备份版本</dt><dd className="text-right text-foreground">v{imported.schemaVersion}</dd></dl>{preview.warnings.length > 0 ? <p className="mt-3 text-xs text-muted-foreground">{preview.warnings.join("；")}</p> : null}<AlertDialog><AlertDialogTrigger asChild><Button className="mt-4 min-h-11 w-full">恢复此备份</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认恢复备份？</AlertDialogTitle><AlertDialogDescription>当前课程、Todo、学期、作息与设置将被此备份替换。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={handleRestore}>确认恢复</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div> : null}

          <div className="border-t pt-3"><AlertDialog><AlertDialogTrigger asChild><Button className="min-h-11 w-full justify-start gap-3" variant="destructive"><Trash2 className="size-4" />清空全部数据</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>清空全部应用数据？</AlertDialogTitle><AlertDialogDescription>课程、Todo、学期、作息与设置都会恢复为初始状态，且无法撤销。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={handleClearAll}>确认清空</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
