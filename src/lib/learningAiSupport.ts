import type { LearningAsset } from "@/types/learning"

export function isLearningAssetAiSupported(asset: Pick<LearningAsset, "type" | "mimeType">): boolean {
  if (asset.type !== "image") return false
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(asset.mimeType.toLowerCase().split(";")[0].trim())
}
