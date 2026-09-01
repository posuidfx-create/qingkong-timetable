import type {
  GrammarAnalysis,
  GrammarItem,
  GrammarItemDraft,
  JapaneseTextbookVolume,
  LessonAnalysis,
  VocabularyLessonAnalysis,
  VocabularyWord,
} from "@/types/vocabulary"
import { VOCABULARY_ANALYSIS_STATUSES, VOCABULARY_MASTERY_LEVELS } from "@/types/vocabulary"

export const MINNA_NO_NIHONGO_KEY = "minna_no_nihongo" as const
export const JAPANESE_LESSON_MIN = 1
export const JAPANESE_LESSON_MAX = 50
export const BEGINNER_ONE_RANGE = { start: 1, end: 25 } as const
export const BEGINNER_TWO_RANGE = { start: 26, end: 50 } as const

function isMastery(value: unknown): value is GrammarItem["mastery"] {
  return typeof value === "string" && (VOCABULARY_MASTERY_LEVELS as readonly string[]).includes(value)
}

function isAnalysisStatus(value: unknown): value is GrammarItem["analysisStatus"] {
  return typeof value === "string" && (VOCABULARY_ANALYSIS_STATUSES as readonly string[]).includes(value)
}

function isTextbookVolume(value: unknown): value is JapaneseTextbookVolume {
  return value === "beginner_1" || value === "beginner_2"
}

export interface LessonCounts {
  lessonNumber: number
  words: number
  grammar: number
  masteredWords: number
  masteredGrammar: number
  analyzed: boolean
}

export function isJapaneseLessonNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= JAPANESE_LESSON_MIN && value <= JAPANESE_LESSON_MAX
}

export function getJapaneseLessonVolume(lessonNumber: number): JapaneseTextbookVolume {
  if (!isJapaneseLessonNumber(lessonNumber)) throw new RangeError("lesson_number_out_of_range")
  return lessonNumber <= BEGINNER_ONE_RANGE.end ? "beginner_1" : "beginner_2"
}

export function getLessonsForVolume(volume: JapaneseTextbookVolume): number[] {
  const range = volume === "beginner_1" ? BEGINNER_ONE_RANGE : BEGINNER_TWO_RANGE
  return Array.from({ length: range.end - range.start + 1 }, (_, index) => range.start + index)
}

export function isWordUnclassified(word: VocabularyWord): boolean {
  return word.textbookKey === null || word.volume === null || word.lessonNumber === null
}

export function wordBelongsToLesson(word: VocabularyWord, lessonNumber: number): boolean {
  return word.textbookKey === MINNA_NO_NIHONGO_KEY && word.lessonNumber === lessonNumber && word.volume === getJapaneseLessonVolume(lessonNumber)
}

export function buildLessonCounts(
  words: readonly VocabularyWord[],
  grammarItems: readonly GrammarItem[],
  analyses: readonly VocabularyLessonAnalysis[],
): LessonCounts[] {
  return Array.from({ length: JAPANESE_LESSON_MAX }, (_, index) => {
    const lessonNumber = index + 1
    const lessonWords = words.filter((word) => wordBelongsToLesson(word, lessonNumber))
    const lessonGrammar = grammarItems.filter((item) => item.textbookKey === MINNA_NO_NIHONGO_KEY && item.lessonNumber === lessonNumber)
    return {
      lessonNumber,
      words: lessonWords.length,
      grammar: lessonGrammar.length,
      masteredWords: lessonWords.filter((word) => word.mastery === "mastered").length,
      masteredGrammar: lessonGrammar.filter((item) => item.mastery === "mastered").length,
      analyzed: analyses.some((item) => item.lessonNumber === lessonNumber && item.status === "completed" && item.analysis !== null),
    }
  })
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : ""
}

function cleanList(value: unknown, maxItems: number, maxLength: number): string[] {
  return Array.isArray(value) ? value.map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems) : []
}

export function parseGrammarAnalysis(value: unknown): GrammarAnalysis | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (row.version !== 1) return null
  const examples = Array.isArray(row.examples) ? row.examples.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return []
    const example = item as Record<string, unknown>
    const sentence = cleanText(example.sentence, 500)
    return sentence ? [{ sentence, translation: cleanText(example.translation, 500) }] : []
  }).slice(0, 6) : []
  return {
    version: 1,
    meaning: cleanText(row.meaning, 1_000),
    connection: cleanText(row.connection, 1_000),
    usageNotes: cleanList(row.usageNotes, 12, 500),
    commonMistakes: cleanList(row.commonMistakes, 10, 500),
    comparisons: cleanList(row.comparisons, 10, 500),
    examples,
    memoryTip: cleanText(row.memoryTip, 500),
    warnings: cleanList(row.warnings, 8, 400),
  }
}

function optionalText(value: unknown): string | null | undefined {
  return value === null ? null : typeof value === "string" ? value : undefined
}

export function parseGrammarItem(value: unknown): GrammarItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const lessonNumber = row.lesson_number
  const meaning = optionalText(row.meaning)
  const connection = optionalText(row.connection)
  const usageNote = optionalText(row.usage_note)
  const example = optionalText(row.example)
  const exampleTranslation = optionalText(row.example_translation)
  const personalNote = optionalText(row.personal_note)
  const analysis = row.analysis_json === null || row.analysis_json === undefined ? null : parseGrammarAnalysis(row.analysis_json)
  if (
    typeof row.id !== "string" || typeof row.user_id !== "string" || row.textbook_key !== MINNA_NO_NIHONGO_KEY
    || !isJapaneseLessonNumber(lessonNumber) || !isTextbookVolume(row.volume) || row.volume !== getJapaneseLessonVolume(lessonNumber)
    || typeof row.pattern !== "string" || meaning === undefined || connection === undefined || usageNote === undefined
    || example === undefined || exampleTranslation === undefined || personalNote === undefined
    || !isMastery(row.mastery) || !isAnalysisStatus(row.analysis_status)
    || (row.analysis_json !== null && row.analysis_json !== undefined && !analysis)
    || typeof row.created_at !== "string" || typeof row.updated_at !== "string"
  ) return null
  return {
    id: row.id,
    userId: row.user_id,
    textbookKey: MINNA_NO_NIHONGO_KEY,
    volume: row.volume,
    lessonNumber,
    pattern: row.pattern,
    meaning,
    connection,
    usageNote,
    example,
    exampleTranslation,
    personalNote,
    mastery: row.mastery,
    analysisStatus: row.analysis_status,
    analysis,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function buildGrammarInsertRow(draft: GrammarItemDraft, userId: string, id: string) {
  const optional = (value: string) => value.trim() || null
  return {
    id,
    user_id: userId,
    textbook_key: MINNA_NO_NIHONGO_KEY,
    volume: getJapaneseLessonVolume(draft.lessonNumber),
    lesson_number: draft.lessonNumber,
    pattern: draft.pattern.trim(),
    meaning: optional(draft.meaning),
    connection: optional(draft.connection),
    usage_note: optional(draft.usageNote),
    example: optional(draft.example),
    example_translation: optional(draft.exampleTranslation),
    personal_note: optional(draft.personalNote),
    mastery: draft.mastery,
  }
}

export function parseLessonAnalysis(value: unknown): LessonAnalysis | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (row.version !== 1) return null
  const analysis: LessonAnalysis = {
    version: 1,
    lessonSummary: cleanText(row.lessonSummary, 2_000),
    keyVocabulary: cleanList(row.keyVocabulary, 30, 300),
    keyGrammar: cleanList(row.keyGrammar, 20, 400),
    commonConfusions: cleanList(row.commonConfusions, 15, 500),
    reviewChecklist: cleanList(row.reviewChecklist, 20, 400),
    suggestedPractice: cleanList(row.suggestedPractice, 15, 500),
    warnings: cleanList(row.warnings, 10, 400),
  }
  return analysis.lessonSummary || analysis.keyVocabulary.length || analysis.keyGrammar.length ? analysis : null
}

export function parseVocabularyLessonAnalysis(value: unknown): VocabularyLessonAnalysis | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const lessonNumber = row.lesson_number
  const analysis = row.analysis_json === null || row.analysis_json === undefined ? null : parseLessonAnalysis(row.analysis_json)
  if (
    typeof row.id !== "string" || typeof row.user_id !== "string" || row.textbook_key !== MINNA_NO_NIHONGO_KEY
    || !isJapaneseLessonNumber(lessonNumber) || !isTextbookVolume(row.volume) || row.volume !== getJapaneseLessonVolume(lessonNumber)
    || !isAnalysisStatus(row.analysis_status)
    || (row.analysis_json !== null && row.analysis_json !== undefined && !analysis)
    || typeof row.created_at !== "string" || typeof row.updated_at !== "string"
  ) return null
  return { id: row.id, userId: row.user_id, textbookKey: MINNA_NO_NIHONGO_KEY, volume: row.volume, lessonNumber, status: row.analysis_status, analysis, createdAt: row.created_at, updatedAt: row.updated_at }
}

export function searchGrammarItems(items: readonly GrammarItem[], query: string): GrammarItem[] {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return [...items]
  return items.filter((item) => [
    item.pattern,
    item.meaning,
    item.connection,
    item.usageNote,
    item.example,
    item.exampleTranslation,
    item.personalNote,
    item.analysis?.meaning,
    item.analysis?.connection,
    ...(item.analysis?.usageNotes ?? []),
    ...(item.analysis?.commonMistakes ?? []),
    ...(item.analysis?.comparisons ?? []),
  ].filter(Boolean).join(" ").toLocaleLowerCase().includes(normalized))
}

export function getLessonPath(lessonNumber: number): string {
  if (!isJapaneseLessonNumber(lessonNumber)) throw new RangeError("lesson_number_out_of_range")
  return `/vocabulary/minna-no-nihongo/lesson/${lessonNumber}`
}

export function getLessonNumberFromPath(pathname: string): number | null {
  const match = pathname.match(/^\/vocabulary\/minna-no-nihongo\/lesson\/(\d{1,2})\/?$/)
  if (!match?.[1]) return null
  const lessonNumber = Number(match[1])
  return isJapaneseLessonNumber(lessonNumber) ? lessonNumber : null
}
