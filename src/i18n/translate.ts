import type { AppLocale } from "@/i18n/locale"
import { jaJP } from "@/i18n/translations.ja-JP"
import { zhCN, type TranslationKey } from "@/i18n/translations.zh-CN"

const dictionaries: Readonly<Record<AppLocale, Readonly<Record<TranslationKey, string>>>> = {
  "zh-CN": zhCN,
  "ja-JP": jaJP,
}

export function translate(locale: AppLocale, key: TranslationKey): string {
  const value = dictionaries[locale][key]
  if (value !== undefined) return value

  if (import.meta.env.DEV) console.warn(`[i18n] Missing ${locale} translation: ${key}`)
  return dictionaries["zh-CN"][key]
}

export function formatTranslation(template: string, values: Readonly<Record<string, string | number>>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  )
}
