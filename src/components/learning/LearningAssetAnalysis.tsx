import { AlertCircle, CheckCircle2, LoaderCircle, Sparkles } from "lucide-react"

import { useI18n } from "@/i18n/useI18n"
import { isLearningAssetAiSupported } from "@/lib/learningAnalysis"
import type { LearningAsset } from "@/types/learning"

export function LearningAssetAnalysis({ asset }: { asset: LearningAsset }) {
  const { t } = useI18n()
  if (!isLearningAssetAiSupported(asset)) return <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><AlertCircle className="size-3.5" />{t("learning.aiUnsupported")}</p>
  if (asset.processingStatus === "processing" || asset.processingStatus === "pending") return <p className="mt-2 flex items-center gap-1.5 text-xs text-primary"><LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />{t("learning.aiProcessing")}</p>
  if (asset.processingStatus === "failed") return <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive"><AlertCircle className="size-3.5" />{t("learning.aiFailed")}</p>
  if (asset.processingStatus !== "completed") return <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="size-3.5 text-primary" />{t("learning.aiReady")}</p>

  const analysis = asset.analysis
  return <section className="mt-3 rounded-2xl border border-primary/20 bg-primary/6 p-3" aria-label={t("learning.aiResult")}>
    <p className="flex items-center gap-2 text-xs font-semibold text-primary"><CheckCircle2 className="size-3.5" />{t("learning.aiCompleted")}</p>
    {analysis?.summary && <div className="mt-3"><h4 className="text-xs font-semibold">{t("learning.aiSummary")}</h4><p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-foreground/85">{analysis.summary}</p></div>}
    {analysis?.keyPoints.length ? <div className="mt-3"><h4 className="text-xs font-semibold">{t("learning.aiKeyPoints")}</h4><ol className="mt-1 space-y-1 pl-5 text-xs leading-6 text-foreground/85">{analysis.keyPoints.map((point, index) => <li className="list-decimal" key={`${index}-${point}`}>{point}</li>)}</ol></div> : null}
    {analysis?.suggestedReview && <div className="mt-3"><h4 className="text-xs font-semibold">{t("learning.aiReview")}</h4><p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-foreground/85">{analysis.suggestedReview}</p></div>}
    {asset.extractedText && <details className="mt-3 border-t border-primary/15 pt-3"><summary className="cursor-pointer text-xs font-semibold text-primary">{t("learning.aiExtractedText")}</summary><p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-foreground/80">{asset.extractedText}</p></details>}
    {analysis?.warnings.length ? <div className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs leading-5 text-foreground/75"><span className="font-semibold">{t("learning.aiWarnings")}</span>{analysis.warnings.map((warning) => <p className="mt-1" key={warning}>{warning}</p>)}</div> : null}
  </section>
}
