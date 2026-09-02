export const LEARNING_RECORD_TYPES = ["daily", "class", "note", "achievement"] as const
export type LearningRecordType = (typeof LEARNING_RECORD_TYPES)[number]

export const LEARNING_ASSET_TYPES = ["image", "document", "audio"] as const
export type LearningAssetType = (typeof LEARNING_ASSET_TYPES)[number]

export const LEARNING_PROCESSING_STATUSES = ["uploaded", "pending", "processing", "completed", "failed"] as const
export type LearningProcessingStatus = (typeof LEARNING_PROCESSING_STATUSES)[number]

export interface LearningAssetAnalysis {
  version: 1
  summary: string
  keyPoints: string[]
  contentType: string
  language: string
  suggestedReview: string
  warnings: string[]
}

export interface LearningAsset {
  id: string
  recordId: string
  userId: string
  type: LearningAssetType
  originalName: string
  mimeType: string
  fileSize: number
  storageBucket: string
  storagePath: string
  sortOrder: number
  processingStatus: LearningProcessingStatus
  extractedText: string | null
  analysis: LearningAssetAnalysis | null
  createdAt: string
}

export interface LearningRecord {
  id: string
  userId: string
  recordDate: string
  title: string | null
  courseName: string | null
  courseKey: string | null
  type: LearningRecordType
  content: string | null
  moodNote: string | null
  processingStatus: LearningProcessingStatus
  analysis: LearningAssetAnalysis | null
  sourceContributionId?: string | null
  sourceAuthorNameSnapshot?: string | null
  sourceTitleSnapshot?: string | null
  quotedAt?: string | null
  createdAt: string
  updatedAt: string
  assets: LearningAsset[]
}

export interface LearningRecordDraft {
  recordDate: string
  title: string
  courseName: string
  courseKey: string
  type: Extract<LearningRecordType, "daily" | "class">
  content: string
  moodNote: string
}

export interface LearningAssetDraft {
  file: File
  type: LearningAssetType
  name: string
  mime: string
  size: number
}

export interface LearningRecordInsertRow {
  id: string
  user_id: string
  record_date: string
  title: string | null
  course_name: string | null
  course_key: string | null
  record_type: LearningRecordDraft["type"]
  content: string | null
  mood_note: string | null
}

export interface LearningAssetInsertRow {
  id: string
  record_id: string
  user_id: string
  asset_type: LearningAssetType
  original_name: string
  mime_type: string
  file_size: number
  storage_bucket: string
  storage_path: string
  sort_order: number
}
