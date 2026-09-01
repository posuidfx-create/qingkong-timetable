import { useEffect, useMemo, useState, type ReactNode } from "react"

import { DEFAULT_LOCALE, readLocale, saveLocale, type AppLocale } from "@/i18n/locale"
import { I18nContext, type I18nValue } from "@/i18n/I18nContext"
import { formatTranslation, translate } from "@/i18n/translate"

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => typeof window === "undefined" ? DEFAULT_LOCALE : readLocale(window.localStorage))

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = translate(locale, "brand.name")
  }, [locale])

  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale: (nextLocale) => {
      setLocaleState(nextLocale)
      saveLocale(typeof window === "undefined" ? undefined : window.localStorage, nextLocale)
    },
    t: (key, values) => values ? formatTranslation(translate(locale, key), values) : translate(locale, key),
  }), [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
