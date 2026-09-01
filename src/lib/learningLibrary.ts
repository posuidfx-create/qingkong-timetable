import { isLearningAssetAiSupported } from "@/lib/learningAiSupport"
import { sortLearningRecords } from "@/lib/learningRecords"
import type { LearningAsset, LearningRecord } from "@/types/learning"
import type { Course } from "@/types/timetable"

export const UNCLASSIFIED_COURSE_KEY = "unclassified"

export interface LearningCourseOption { key: string; name: string }
export interface LearningCourseIndexItem extends LearningCourseOption {
  assets: number
  completedAssets: number
  current: boolean
  knowledgePoints: number
  latestDate: string | null
  pendingAssets: number
  records: LearningRecord[]
}

export interface LearningKnowledgeItem {
  id: string
  kind: "note" | "summary" | "keyPoint" | "review"
  record: LearningRecord
  source: string
  text: string
  title: string
}

export interface LearningSearchResult {
  courseKey: string
  courseName: string
  id: string
  kind: "course" | "record" | "material" | "knowledge"
  source: string
  text: string
}

function normalizedName(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ").toLocaleLowerCase() ?? ""
}

function hash(value: string): string {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(36)
}

export function createTimetableCourseKey(courseId: string): string {
  return `course-${hash(courseId)}`
}

export function createSnapshotCourseKey(name: string): string {
  return `archive-${hash(normalizedName(name))}`
}

export function buildTimetableCourseOptions(courses: readonly Course[]): LearningCourseOption[] {
  const groups = new Map<string, { ids: string[]; name: string }>()
  for (const course of courses) {
    const name = course.name.trim()
    const identity = normalizedName(name)
    if (!identity) continue
    const group = groups.get(identity) ?? { ids: [], name }
    group.ids.push(course.id)
    groups.set(identity, group)
  }
  return [...groups.values()]
    .map((group) => ({ key: createTimetableCourseKey([...group.ids].sort()[0] ?? group.name), name: group.name }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
}

function resolveRecordCourse(record: LearningRecord, currentByName: ReadonlyMap<string, LearningCourseOption>): LearningCourseOption {
  if (record.courseKey?.trim()) return { key: record.courseKey.trim(), name: record.courseName?.trim() || record.courseKey.trim() }
  const name = record.courseName?.trim()
  if (!name) return { key: UNCLASSIFIED_COURSE_KEY, name: "" }
  return currentByName.get(normalizedName(name)) ?? { key: createSnapshotCourseKey(name), name }
}

export function buildLearningCourseIndex(courses: readonly Course[], records: readonly LearningRecord[]): LearningCourseIndexItem[] {
  const currentOptions = buildTimetableCourseOptions(courses)
  const currentKeys = new Set(currentOptions.map((course) => course.key))
  const currentByName = new Map(currentOptions.map((course) => [normalizedName(course.name), course]))
  const entries = new Map<string, { name: string; records: LearningRecord[] }>()
  for (const option of currentOptions) entries.set(option.key, { name: option.name, records: [] })
  for (const record of records) {
    const resolved = resolveRecordCourse(record, currentByName)
    const entry = entries.get(resolved.key) ?? { name: resolved.name, records: [] }
    entry.records.push(record)
    entries.set(resolved.key, entry)
  }
  return [...entries].map(([key, value]) => {
    const sorted = sortLearningRecords(value.records)
    const assets = sorted.flatMap((record) => record.assets)
    return {
      key,
      name: value.name,
      records: sorted,
      assets: assets.length,
      completedAssets: assets.filter((asset) => asset.processingStatus === "completed").length,
      current: currentKeys.has(key),
      knowledgePoints: sorted.reduce((count, record) => count + (record.analysis?.keyPoints.length ?? 0), 0) + assets.reduce((count, asset) => count + (asset.analysis?.keyPoints.length ?? 0), 0),
      latestDate: sorted[0]?.recordDate ?? null,
      pendingAssets: assets.filter((asset) => isLearningAssetAiSupported(asset) && asset.processingStatus !== "completed").length,
    }
  }).sort((left, right) => Number(right.current) - Number(left.current) || left.name.localeCompare(right.name, "zh-CN"))
}

export function getLearningCourseOptions(index: readonly LearningCourseIndexItem[]): LearningCourseOption[] {
  return index.filter((course) => course.key !== UNCLASSIFIED_COURSE_KEY).map(({ key, name }) => ({ key, name }))
}

export function getRecordCourseKey(record: LearningRecord, index: readonly LearningCourseIndexItem[]): string {
  if (record.courseKey?.trim()) return record.courseKey.trim()
  if (!record.courseName?.trim()) return UNCLASSIFIED_COURSE_KEY
  const match = index.find((course) => normalizedName(course.name) === normalizedName(record.courseName))
  return match?.key ?? createSnapshotCourseKey(record.courseName)
}

export function buildLearningKnowledge(records: readonly LearningRecord[]): LearningKnowledgeItem[] {
  const items: LearningKnowledgeItem[] = []
  for (const record of sortLearningRecords(records)) {
    const recordTitle = record.title?.trim() || record.courseName?.trim() || record.recordDate
    if (record.content?.trim()) items.push({ id: `${record.id}-note`, kind: "note", record, source: recordTitle, text: record.content.trim(), title: recordTitle })
    if (record.analysis?.summary.trim()) items.push({ id: `${record.id}-summary`, kind: "summary", record, source: recordTitle, text: record.analysis.summary.trim(), title: recordTitle })
    record.analysis?.keyPoints.filter(Boolean).forEach((text, index) => items.push({ id: `${record.id}-point-${index}`, kind: "keyPoint", record, source: recordTitle, text: text.trim(), title: text.trim() }))
    if (record.analysis?.suggestedReview.trim()) items.push({ id: `${record.id}-review`, kind: "review", record, source: recordTitle, text: record.analysis.suggestedReview.trim(), title: recordTitle })
    for (const asset of record.assets) {
      const analysis = asset.analysis
      if (!analysis) continue
      if (analysis.summary.trim()) items.push({ id: `${asset.id}-summary`, kind: "summary", record, source: asset.originalName, text: analysis.summary.trim(), title: recordTitle })
      analysis.keyPoints.filter(Boolean).forEach((text, index) => items.push({ id: `${asset.id}-point-${index}`, kind: "keyPoint", record, source: asset.originalName, text: text.trim(), title: text.trim() }))
      if (analysis.suggestedReview.trim()) items.push({ id: `${asset.id}-review`, kind: "review", record, source: asset.originalName, text: analysis.suggestedReview.trim(), title: recordTitle })
    }
  }
  return items
}

function includes(value: string | null | undefined, query: string): boolean {
  return normalizedName(value).includes(query)
}

export function searchLearningLibrary(index: readonly LearningCourseIndexItem[], query: string): LearningSearchResult[] {
  const normalizedQuery = normalizedName(query)
  if (!normalizedQuery) return []
  const results: LearningSearchResult[] = []
  for (const course of index) {
    if (includes(course.name, normalizedQuery)) results.push({ courseKey: course.key, courseName: course.name, id: `course-${course.key}`, kind: "course", source: course.name, text: course.name })
    for (const record of course.records) {
      if ([record.title, record.content, record.moodNote].some((value) => includes(value, normalizedQuery))) results.push({ courseKey: course.key, courseName: course.name, id: `record-${record.id}`, kind: "record", source: record.title?.trim() || record.recordDate, text: record.content?.trim() || record.moodNote?.trim() || record.title?.trim() || "" })
      const recordKnowledge = [record.analysis?.summary, record.analysis?.suggestedReview, ...(record.analysis?.keyPoints ?? [])]
      if (recordKnowledge.some((value) => includes(value, normalizedQuery))) results.push({ courseKey: course.key, courseName: course.name, id: `knowledge-record-${record.id}`, kind: "knowledge", source: record.title?.trim() || record.recordDate, text: recordKnowledge.filter(Boolean).join(" · ") })
      for (const asset of record.assets) {
        if (includes(asset.originalName, normalizedQuery)) results.push({ courseKey: course.key, courseName: course.name, id: `asset-${asset.id}`, kind: "material", source: asset.originalName, text: asset.originalName })
        const searchable = [asset.analysis?.summary, asset.analysis?.suggestedReview, ...(asset.analysis?.keyPoints ?? [])]
        if (searchable.some((value) => includes(value, normalizedQuery))) results.push({ courseKey: course.key, courseName: course.name, id: `knowledge-${asset.id}`, kind: "knowledge", source: asset.originalName, text: searchable.filter(Boolean).join(" · ") })
      }
    }
  }
  return results
}

export function getCourseAssets(records: readonly LearningRecord[]): Array<{ asset: LearningAsset; record: LearningRecord }> {
  return sortLearningRecords(records).flatMap((record) => record.assets.map((asset) => ({ asset, record })))
}

export function getCourseAnalysisQueue(records: readonly LearningRecord[]): LearningRecord[] {
  return records.filter((record) => (record.processingStatus !== "completed" && [record.title, record.courseName, record.content, record.moodNote].some((value) => Boolean(value?.trim()))) || record.assets.some((asset) => isLearningAssetAiSupported(asset) && asset.processingStatus !== "completed"))
}

export interface CourseAnalysisProgress { completed: number; failed: number; processed: number; total: number }

export async function runCourseAnalysisQueue(
  records: readonly LearningRecord[],
  analyze: (record: LearningRecord) => Promise<void>,
  onProgress?: (progress: CourseAnalysisProgress) => void,
  concurrency = 2,
): Promise<CourseAnalysisProgress> {
  const queue = getCourseAnalysisQueue(records)
  let cursor = 0; let completed = 0; let failed = 0; let processed = 0
  const worker = async () => {
    while (cursor < queue.length) {
      const record = queue[cursor]; cursor += 1
      try { await analyze(record); completed += 1 } catch { failed += 1 }
      processed += 1; onProgress?.({ completed, failed, processed, total: queue.length })
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), queue.length) }, worker))
  return { completed, failed, processed, total: queue.length }
}
