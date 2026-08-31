import { useState } from "react"
import { Droplets } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { markMajorUpdateSeen, shouldShowMajorUpdate } from "@/lib/versionAnnouncement"
import { useI18n } from "@/i18n/useI18n"

interface MajorUpdatePromptProps {
  onViewUpdates: () => void
}

export function MajorUpdatePrompt({ onViewUpdates }: MajorUpdatePromptProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(() => shouldShowMajorUpdate(typeof window === "undefined" ? undefined : window.localStorage))

  const dismiss = () => {
    markMajorUpdateSeen(window.localStorage)
    setOpen(false)
  }

  return <AlertDialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) dismiss() }}>
    <AlertDialogContent className="major-update-dialog rounded-[24px] p-5 sm:max-w-md">
      <AlertDialogHeader>
        <AlertDialogMedia className="rounded-2xl bg-primary/12 text-primary"><Droplets aria-hidden="true" /></AlertDialogMedia>
        <AlertDialogTitle className="text-lg">{t("major.title")}</AlertDialogTitle>
        <AlertDialogDescription className="space-y-3 text-left leading-6">
          <span className="block">{t("major.description")}</span>
          <span className="major-update-notice block rounded-2xl border px-3 py-2.5 text-xs leading-5 text-foreground">{t("major.pwaNotice")}</span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="mt-1 rounded-b-[24px]">
        <AlertDialogCancel onClick={dismiss}>{t("major.dismiss")}</AlertDialogCancel>
        <AlertDialogAction onClick={() => { dismiss(); onViewUpdates() }}>{t("major.view")}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
