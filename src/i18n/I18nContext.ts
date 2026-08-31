import { createContext } from "react"

import type { AppLocale } from "@/i18n/locale"
import type { TranslationKey } from "@/i18n/translations.zh-CN"
import { zhCN } from "@/i18n/translations.zh-CN"

export interface I18nValue {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  t: (key: TranslationKey) => string
}

export const I18nContext = createContext<I18nValue>({
  locale: "zh-CN",
  setLocale: () => undefined,
  t: (key) => zhCN[key],
})
