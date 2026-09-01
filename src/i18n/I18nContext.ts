import { createContext } from "react"

import type { AppLocale } from "@/i18n/locale"
import type { TranslationKey } from "@/i18n/translations.zh-CN"
import { zhCN } from "@/i18n/translations.zh-CN"
import { formatTranslation } from "@/i18n/translate"

export interface I18nValue {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  t: (key: TranslationKey, values?: Readonly<Record<string, string | number>>) => string
}

export const I18nContext = createContext<I18nValue>({
  locale: "zh-CN",
  setLocale: () => undefined,
  t: (key, values) => values ? formatTranslation(zhCN[key], values) : zhCN[key],
})
