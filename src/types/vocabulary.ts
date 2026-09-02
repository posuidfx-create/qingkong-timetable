export const VOCABULARY_LANGUAGES = ["ja-JP", "en-US", "en-GB", "zh-CN"] as const
export type VocabularyLanguage = (typeof VOCABULARY_LANGUAGES)[number]

export const VOCABULARY_MASTERY_LEVELS = ["new", "learning", "mastered"] as const
export type VocabularyMastery = (typeof VOCABULARY_MASTERY_LEVELS)[number]

export const VOCABULARY_ANALYSIS_STATUSES = ["uploaded", "processing", "completed", "failed"] as const
export type VocabularyAnalysisStatus = (typeof VOCABULARY_ANALYSIS_STATUSES)[number]

export const JAPANESE_TEXTBOOK_KEYS = ["minna_no_nihongo"] as const
export type JapaneseTextbookKey = (typeof JAPANESE_TEXTBOOK_KEYS)[number]

export const JAPANESE_TEXTBOOK_VOLUMES = ["beginner_1", "beginner_2"] as const
export type JapaneseTextbookVolume = (typeof JAPANESE_TEXTBOOK_VOLUMES)[number]

export interface VocabularyExample {
  text: string
  translation: string
}

export interface VocabularyAnalysis {
  version: 1
  language: string
  reading: string
  pronunciation: string
  partsOfSpeech: string[]
  meanings: string[]
  usageNotes: string[]
  collocations: string[]
  forms: string[]
  confusions: string[]
  examples: VocabularyExample[]
  memoryTip: string
  warnings: string[]
}

export interface VocabularyWord {
  id: string
  userId: string
  term: string
  language: VocabularyLanguage
  reading: string | null
  meaning: string | null
  notes: string | null
  courseName: string | null
  courseKey: string | null
  textbookKey?: JapaneseTextbookKey | null
  volume?: JapaneseTextbookVolume | null
  lessonNumber?: number | null
  mastery: VocabularyMastery
  analysisStatus: VocabularyAnalysisStatus
  analysis: VocabularyAnalysis | null
  createdAt: string
  updatedAt: string
}

export interface VocabularyWordDraft {
  term: string
  language: VocabularyLanguage
  reading: string
  meaning: string
  notes: string
  courseName: string
  courseKey: string
  textbookKey?: JapaneseTextbookKey | ""
  volume?: JapaneseTextbookVolume | ""
  lessonNumber?: number | null
  mastery: VocabularyMastery
}

export interface ExtractedVocabularyWord {
  term: string
  reading: string
  partOfSpeech: string
  meanings: string[]
  sourceText: string
  tileIndex: number
  rowOrder: number
  confidence: number
  warnings: string[]
  needsReview: boolean
  recognitionStatus: "clear" | "review" | "unconfirmed"
}

export interface VocabularyStageDiagnostics {
  visionRawCount: number
  afterTileMergeCount: number
  afterValidationCount: number
  finalReviewCount: number
  tileCandidateCounts: number[]
}

export interface VocabularyImageExtraction {
  version: 1
  words: ExtractedVocabularyWord[]
  warnings: string[]
  tileCount: number
  possibleCoverageGap: boolean
  coverageGapTileIndexes: number[]
  stageDiagnostics: VocabularyStageDiagnostics
}

export interface GrammarExample {
  sentence: string
  translation: string
}

export interface GrammarAnalysis {
  version: 1
  meaning: string
  connection: string
  usageNotes: string[]
  commonMistakes: string[]
  comparisons: string[]
  examples: GrammarExample[]
  memoryTip: string
  warnings: string[]
}

export interface GrammarItem {
  id: string
  userId: string
  textbookKey: JapaneseTextbookKey
  volume: JapaneseTextbookVolume
  lessonNumber: number
  pattern: string
  meaning: string | null
  connection: string | null
  usageNote: string | null
  example: string | null
  exampleTranslation: string | null
  personalNote: string | null
  mastery: VocabularyMastery
  analysisStatus: VocabularyAnalysisStatus
  analysis: GrammarAnalysis | null
  createdAt: string
  updatedAt: string
}

export interface GrammarItemDraft {
  textbookKey: JapaneseTextbookKey
  volume: JapaneseTextbookVolume
  lessonNumber: number
  pattern: string
  meaning: string
  connection: string
  usageNote: string
  example: string
  exampleTranslation: string
  personalNote: string
  mastery: VocabularyMastery
}

export interface LessonAnalysis {
  version: 1
  lessonSummary: string
  keyVocabulary: string[]
  keyGrammar: string[]
  commonConfusions: string[]
  reviewChecklist: string[]
  suggestedPractice: string[]
  warnings: string[]
}

export interface VocabularyLessonAnalysis {
  id: string
  userId: string
  textbookKey: JapaneseTextbookKey
  volume: JapaneseTextbookVolume
  lessonNumber: number
  status: VocabularyAnalysisStatus
  analysis: LessonAnalysis | null
  createdAt: string
  updatedAt: string
}
