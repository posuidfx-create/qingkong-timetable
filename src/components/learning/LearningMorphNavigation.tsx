import { learningMorphItems } from "@/lib/learningEditorial"
import type { LearningView } from "@/lib/learningNavigation"
import { useI18n } from "@/i18n/useI18n"

interface LearningMorphNavigationProps {
  activeView: Exclude<LearningView, "hub">
  onNavigate: (view: Exclude<LearningView, "hub">) => void
}

export function LearningMorphNavigation({ activeView, onNavigate }: LearningMorphNavigationProps) {
  const { t } = useI18n()

  return (
    <nav aria-label={t("learning.morphNavigation")} className="learning-morph-navigation">
      {learningMorphItems.map((item) => {
        const active = item.view === activeView
        return (
          <button
            aria-current={active ? "page" : undefined}
            className="learning-morph-navigation__item"
            data-active={active}
            key={item.view}
            onClick={() => onNavigate(item.view)}
            type="button"
          >
            <span className="learning-morph-navigation__number">{item.number}</span>
            <span className="learning-morph-navigation__label">{t(item.titleKey)}</span>
          </button>
        )
      })}
    </nav>
  )
}
