import type { LearningAssetDraft } from "@/types/learning"

export interface LearningDraftFile {
  id: string
  draft: LearningAssetDraft
  previewUrl: string | null
}

export interface LearningObjectUrlApi {
  createObjectURL: (file: File) => string
  revokeObjectURL: (url: string) => void
}

export class LearningDraftPreviewStore {
  private nextId = 0
  private readonly activeUrls = new Set<string>()

  constructor(private readonly objectUrls: LearningObjectUrlApi) {}

  create(draft: LearningAssetDraft): LearningDraftFile {
    const previewUrl = draft.type === "image" ? this.objectUrls.createObjectURL(draft.file) : null
    if (previewUrl) this.activeUrls.add(previewUrl)
    this.nextId += 1
    return { id: `learning-draft-${this.nextId}`, draft, previewUrl }
  }

  release(file: LearningDraftFile): void {
    if (file.previewUrl && this.activeUrls.delete(file.previewUrl)) this.objectUrls.revokeObjectURL(file.previewUrl)
  }

  releaseAll(): void {
    for (const url of this.activeUrls) this.objectUrls.revokeObjectURL(url)
    this.activeUrls.clear()
  }
}

export function learningDraftFilesForUpload(files: readonly LearningDraftFile[]): File[] {
  return files.map((item) => item.draft.file)
}
