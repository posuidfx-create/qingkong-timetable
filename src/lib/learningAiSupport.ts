import type { LearningAsset } from "@/types/learning"

export function isLearningAssetAiSupported(asset: Pick<LearningAsset, "type" | "mimeType">): boolean {
  void asset
  return false
}
