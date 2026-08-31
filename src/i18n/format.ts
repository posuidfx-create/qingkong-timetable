import type { AppLocale } from "@/i18n/locale"
import type { AppRole } from "@/types/auth"
import type { DayOfWeek } from "@/types/timetable"
import { translate } from "@/i18n/translate"

export function formatLocalizedDate(date: Date, locale: AppLocale, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, options).format(date)
}

export function getLocalizedDayLabel(day: DayOfWeek, locale: AppLocale): string {
  const keys = ["date.monday", "date.tuesday", "date.wednesday", "date.thursday", "date.friday", "date.saturday", "date.sunday"] as const
  return translate(locale, keys[day - 1])
}

export function getLocalizedRoleLabel(role: AppRole, locale: AppLocale): string {
  const labels: Record<AppRole, Record<AppLocale, string>> = {
    user: { "zh-CN": "用户", "ja-JP": "ユーザー" },
    admin: { "zh-CN": "管理员", "ja-JP": "管理者" },
    super_admin: { "zh-CN": "超级管理员", "ja-JP": "スーパー管理者" },
  }
  return labels[role][locale]
}
