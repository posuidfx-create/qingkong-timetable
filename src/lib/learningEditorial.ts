import type { TranslationKey } from "@/i18n/translations.zh-CN"
import type { LearningRecord } from "@/types/learning"

import type { LearningView } from "@/lib/learningNavigation"

export interface LearningIndexItem {
  descriptionKey: TranslationKey
  id: "today" | "records" | "archive" | "words" | "growth"
  number: string
  target: LearningView | null
  titleKey: TranslationKey
}

export const learningIndexItems: readonly LearningIndexItem[] = [
  { id: "today", number: "01", titleKey: "learning.indexToday", descriptionKey: "learning.todayDescription", target: "today" },
  { id: "records", number: "02", titleKey: "learning.records", descriptionKey: "learning.recordsDescription", target: "timeline" },
  { id: "archive", number: "03", titleKey: "learning.courseArchive", descriptionKey: "learning.archiveDescription", target: "archive" },
  { id: "words", number: "04", titleKey: "learning.words", descriptionKey: "learning.wordsDescription", target: null },
  { id: "growth", number: "05", titleKey: "learning.growth", descriptionKey: "learning.timelineDescription", target: null },
] as const

export const learningMorphItems: ReadonlyArray<{
  number: string
  titleKey: TranslationKey
  view: Exclude<LearningView, "hub">
}> = [
  { number: "01", titleKey: "learning.indexToday", view: "today" },
  { number: "02", titleKey: "learning.records", view: "timeline" },
  { number: "03", titleKey: "learning.courseArchive", view: "archive" },
]

export interface LearningAssetCounts {
  audio: number
  document: number
  image: number
  pdf: number
  total: number
}

export function getLearningAssetCounts(record: LearningRecord): LearningAssetCounts {
  return record.assets.reduce<LearningAssetCounts>((counts, asset) => {
    counts.total += 1
    if (asset.type === "image") counts.image += 1
    else if (asset.type === "audio") counts.audio += 1
    else if (asset.mimeType === "application/pdf" || asset.originalName.toLowerCase().endsWith(".pdf")) counts.pdf += 1
    else counts.document += 1
    return counts
  }, { audio: 0, document: 0, image: 0, pdf: 0, total: 0 })
}

export function getLearningRecordHeadline(record: LearningRecord): string | null {
  const title = record.title?.trim()
  if (title) return title

  const firstContentLine = record.content
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)

  if (firstContentLine) return firstContentLine

  const firstMoodLine = record.moodNote
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)

  return firstMoodLine || null
}

export function getRecentLearningRecords(records: readonly LearningRecord[], limit = 4): LearningRecord[] {
  return [...records]
    .sort((left, right) => {
      const dateOrder = right.recordDate.localeCompare(left.recordDate)
      return dateOrder || right.updatedAt.localeCompare(left.updatedAt)
    })
    .slice(0, Math.max(0, limit))
}

export function getTodayLearningRecords(records: readonly LearningRecord[], today: string): LearningRecord[] {
  return getRecentLearningRecords(records.filter((record) => record.recordDate === today), records.length)
}

export function getTodayCourseNames(records: readonly LearningRecord[], today: string): string[] {
  return [...new Set(getTodayLearningRecords(records, today).map((record) => record.courseName?.trim()).filter((name): name is string => Boolean(name)))]
}
