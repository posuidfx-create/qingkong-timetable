import { useContext } from "react"

import { I18nContext, type I18nValue } from "@/i18n/I18nContext"

export function useI18n(): I18nValue {
  return useContext(I18nContext)
}
