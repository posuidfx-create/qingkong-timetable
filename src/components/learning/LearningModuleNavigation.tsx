import { useI18n } from "@/i18n/useI18n"

export type LearningModule = "library" | "vocabulary"

interface LearningModuleNavigationProps {
  active: LearningModule
  onOpenLibrary: () => void
  onOpenVocabulary: () => void
}

export function LearningModuleNavigation({ active, onOpenLibrary, onOpenVocabulary }: LearningModuleNavigationProps) {
  const { t } = useI18n()

  return <nav aria-label={t("learning.moduleNavigation")} className="learning-module-navigation">
    <span>LEARNING</span>
    <div>
      <button aria-current={active === "library" ? "page" : undefined} data-active={active === "library"} onClick={onOpenLibrary} type="button">{t("learning.courseKnowledgeLibrary")}</button>
      <button aria-current={active === "vocabulary" ? "page" : undefined} data-active={active === "vocabulary"} onClick={onOpenVocabulary} type="button">{t("learning.words")}</button>
    </div>
  </nav>
}
