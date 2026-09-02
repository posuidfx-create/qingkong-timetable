export const CONTRIBUTION_TYPES = ["note", "knowledge", "resource"] as const
export type ContributionType = (typeof CONTRIBUTION_TYPES)[number]
export type ContributionStatus = "published" | "hidden" | "deleted"

export interface CourseContributionAsset {
  id: string
  contributionId: string
  fileName: string
  mimeType: string
  fileSize: number
  storageBucket: string
  storagePath: string
  createdAt: string
}

export interface CourseContribution {
  id: string
  authorId: string
  authorName: string
  courseKey: string
  courseName: string
  sourceRecordId: string | null
  title: string
  content: string
  type: ContributionType
  language: string
  status: ContributionStatus
  aiSummary: string | null
  aiKeyPoints: string[]
  aiSuggestedReview: string | null
  publishedAt: string
  updatedAt: string
  bookmarkCount: number
  bookmarked: boolean
  assets: CourseContributionAsset[]
}

export interface CourseCommonsAnalysis {
  version: 1
  courseSummary: string
  keyTopics: string[]
  recurringDifficulties: string[]
  recommendedReview: string[]
  recentUpdates: string[]
  sourceContributionIds: string[]
}

export interface PublishContributionInput {
  sourceRecordId: string
  title: string
  content: string
  type: ContributionType
  language: string
  sharedAssetIds: string[]
  confirmAssetRights: boolean
}

export interface CourseCommonsMetrics {
  contributions: number
  contributors: number
}
