export const SUPPORTED_LOCALES = ["zh-CN", "ja-JP"] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = "zh-CN"
export const LOCALE_STORAGE_KEY = "app_locale"

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as AppLocale)
}

export function resolveLocale(value: unknown): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_LOCALE
}

export function readLocale(storage: Pick<Storage, "getItem"> | undefined): AppLocale {
  return resolveLocale(storage?.getItem(LOCALE_STORAGE_KEY))
}

export function saveLocale(storage: Pick<Storage, "setItem"> | undefined, locale: AppLocale): AppLocale {
  storage?.setItem(LOCALE_STORAGE_KEY, locale)
  return locale
}

export function getCurrentLocale(): AppLocale {
  if (typeof document !== "undefined" && isAppLocale(document.documentElement.lang)) return document.documentElement.lang
  return typeof window === "undefined" ? DEFAULT_LOCALE : readLocale(window.localStorage)
}
