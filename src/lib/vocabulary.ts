import { getJapaneseLessonVolume, isJapaneseLessonNumber } from "@/lib/japaneseLessons"
import type { JapaneseTextbookKey, JapaneseTextbookVolume, VocabularyAnalysis, VocabularyAnalysisStatus, VocabularyLanguage, VocabularyMastery, VocabularyWord, VocabularyWordDraft } from "@/types/vocabulary"
import { JAPANESE_TEXTBOOK_KEYS, JAPANESE_TEXTBOOK_VOLUMES, VOCABULARY_ANALYSIS_STATUSES, VOCABULARY_LANGUAGES, VOCABULARY_MASTERY_LEVELS } from "@/types/vocabulary"

export type VocabularySort = "recent" | "alphabetical" | "mastery"

export function isVocabularyLanguage(value: unknown): value is VocabularyLanguage {
  return typeof value === "string" && (VOCABULARY_LANGUAGES as readonly string[]).includes(value)
}

export function isVocabularyMastery(value: unknown): value is VocabularyMastery {
  return typeof value === "string" && (VOCABULARY_MASTERY_LEVELS as readonly string[]).includes(value)
}

export function isVocabularyAnalysisStatus(value: unknown): value is VocabularyAnalysisStatus {
  return typeof value === "string" && (VOCABULARY_ANALYSIS_STATUSES as readonly string[]).includes(value)
}

function isJapaneseTextbookKey(value: unknown): value is JapaneseTextbookKey {
  return typeof value === "string" && (JAPANESE_TEXTBOOK_KEYS as readonly string[]).includes(value)
}

function isJapaneseTextbookVolume(value: unknown): value is JapaneseTextbookVolume {
  return typeof value === "string" && (JAPANESE_TEXTBOOK_VOLUMES as readonly string[]).includes(value)
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : ""
}

function cleanList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems)
}

export function parseVocabularyAnalysis(value: unknown): VocabularyAnalysis | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (row.version !== 1) return null
  const examples = Array.isArray(row.examples)
    ? row.examples.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return []
        const example = item as Record<string, unknown>
        const text = cleanText(example.text, 500)
        const translation = cleanText(example.translation, 500)
        return text ? [{ text, translation }] : []
      }).slice(0, 5)
    : []
  return {
    version: 1,
    language: cleanText(row.language, 40),
    reading: cleanText(row.reading, 160),
    pronunciation: cleanText(row.pronunciation, 160),
    partsOfSpeech: cleanList(row.partsOfSpeech, 8, 80),
    meanings: cleanList(row.meanings, 12, 300),
    usageNotes: cleanList(row.usageNotes, 10, 400),
    collocations: cleanList(row.collocations, 12, 200),
    forms: cleanList(row.forms, 12, 200),
    confusions: cleanList(row.confusions, 10, 300),
    examples,
    memoryTip: cleanText(row.memoryTip, 500),
    warnings: cleanList(row.warnings, 8, 300),
  }
}

function optionalText(value: unknown): string | null | undefined {
  return value === null ? null : typeof value === "string" ? value : undefined
}

export function parseVocabularyWord(value: unknown): VocabularyWord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const reading = optionalText(row.reading)
  const meaning = optionalText(row.meaning)
  const notes = optionalText(row.notes)
  const courseName = optionalText(row.course_name)
  const courseKey = optionalText(row.course_key)
  const textbookKey = row.textbook_key === null ? null : isJapaneseTextbookKey(row.textbook_key) ? row.textbook_key : undefined
  const volume = row.volume === null ? null : isJapaneseTextbookVolume(row.volume) ? row.volume : undefined
  const lessonNumber = row.lesson_number === null ? null : isJapaneseLessonNumber(row.lesson_number) ? row.lesson_number : undefined
  const analysis = row.analysis_json === null || row.analysis_json === undefined ? null : parseVocabularyAnalysis(row.analysis_json)
  if (
    typeof row.id !== "string" || typeof row.user_id !== "string" || typeof row.term !== "string" || !isVocabularyLanguage(row.language)
    || reading === undefined || meaning === undefined || notes === undefined || courseName === undefined || courseKey === undefined
    || textbookKey === undefined || volume === undefined || lessonNumber === undefined
    || (lessonNumber !== null && (textbookKey === null || volume !== getJapaneseLessonVolume(lessonNumber)))
    || !isVocabularyMastery(row.mastery) || !isVocabularyAnalysisStatus(row.analysis_status)
    || (row.analysis_json !== null && row.analysis_json !== undefined && !analysis)
    || typeof row.created_at !== "string" || typeof row.updated_at !== "string"
  ) return null
  return { id: row.id, userId: row.user_id, term: row.term, language: row.language, reading, meaning, notes, courseName, courseKey, textbookKey, volume, lessonNumber, mastery: row.mastery, analysisStatus: row.analysis_status, analysis, createdAt: row.created_at, updatedAt: row.updated_at }
}

export function detectVocabularyLanguage(term: string): VocabularyLanguage {
  if (/[ぁ-ゟ゠-ヿ]/u.test(term)) return "ja-JP"
  if (/\p{Script=Han}/u.test(term)) return "zh-CN"
  return "en-US"
}

export function normalizeVocabularyTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ").toLocaleLowerCase()
}

export function hasDuplicateVocabularyWord(words: readonly VocabularyWord[], term: string, language: VocabularyLanguage, ignoredId?: string): boolean {
  const normalized = normalizeVocabularyTerm(term)
  return words.some((word) => word.id !== ignoredId && word.language === language && normalizeVocabularyTerm(word.term) === normalized)
}

export function vocabularySearchText(word: VocabularyWord): string {
  const analysis = word.analysis
  return [word.term, word.reading, word.meaning, word.notes, word.courseName, analysis?.reading, analysis?.pronunciation, ...(analysis?.meanings ?? []), ...(analysis?.collocations ?? []), ...(analysis?.usageNotes ?? [])]
    .filter((item): item is string => Boolean(item))
    .join(" ")
    .toLocaleLowerCase()
}

export function searchVocabularyWords(words: readonly VocabularyWord[], query: string): VocabularyWord[] {
  const normalized = query.trim().toLocaleLowerCase()
  return normalized ? words.filter((word) => vocabularySearchText(word).includes(normalized)) : [...words]
}

const masteryRank: Readonly<Record<VocabularyMastery, number>> = { new: 0, learning: 1, mastered: 2 }

export function sortVocabularyWords(words: readonly VocabularyWord[], sort: VocabularySort, locale: string): VocabularyWord[] {
  return [...words].sort((left, right) => {
    if (sort === "alphabetical") return left.term.localeCompare(right.term, locale, { sensitivity: "base" })
    if (sort === "mastery") return masteryRank[left.mastery] - masteryRank[right.mastery] || left.term.localeCompare(right.term, locale)
    return right.createdAt.localeCompare(left.createdAt)
  })
}

export function buildVocabularyInsertRow(draft: VocabularyWordDraft, userId: string, id: string) {
  const optional = (value: string) => value.trim() || null
  return {
    id,
    user_id: userId,
    term: draft.term.trim(),
    language: draft.language,
    reading: optional(draft.reading),
    meaning: optional(draft.meaning),
    notes: optional(draft.notes),
    course_name: optional(draft.courseName),
    course_key: optional(draft.courseKey),
    textbook_key: draft.lessonNumber == null ? null : draft.textbookKey || null,
    volume: draft.lessonNumber == null ? null : getJapaneseLessonVolume(draft.lessonNumber),
    lesson_number: draft.lessonNumber ?? null,
    mastery: draft.mastery,
  }
}
