export const VOCABULARY_TILE_OVERLAP_RATIO = 0.08
export const VOCABULARY_TILE_MIN_COUNT = 3
export const VOCABULARY_TILE_MAX_COUNT = 6
export const VOCABULARY_TILE_MAX_WIDTH = 2_400

export interface VocabularyCropRect {
  left: number
  top: number
  right: number
  bottom: number
}

export interface VocabularyTileRegion {
  index: number
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
}

export interface VocabularyImageQuality {
  width: number
  height: number
  aspectRatio: number
  tileCount: number
  partitioned: boolean
  sharpness: number | null
  blurry: boolean
}

export interface PreparedVocabularyImage {
  tiles: File[]
  quality: VocabularyImageQuality
}

export const FULL_VOCABULARY_CROP: VocabularyCropRect = { left: 0, top: 0, right: 1, bottom: 1 }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function normalizeVocabularyCrop(rect: VocabularyCropRect): VocabularyCropRect {
  const left = clamp(rect.left, 0, 0.95)
  const top = clamp(rect.top, 0, 0.95)
  return {
    left,
    top,
    right: clamp(rect.right, left + 0.05, 1),
    bottom: clamp(rect.bottom, top + 0.05, 1),
  }
}

export function chooseVocabularyTileCount(width: number, height: number): number {
  if (!(width > 0 && height > 0)) throw new RangeError("invalid_image_dimensions")
  const ratio = height / width
  if (ratio < 1.05) return 3
  if (ratio < 1.75) return 4
  if (ratio < 2.45) return 5
  return 6
}

export function buildVocabularyTileRegions(width: number, height: number, count = chooseVocabularyTileCount(width, height)): VocabularyTileRegion[] {
  if (!(width > 0 && height > 0) || !Number.isInteger(count) || count < VOCABULARY_TILE_MIN_COUNT || count > VOCABULARY_TILE_MAX_COUNT) throw new RangeError("invalid_tile_plan")
  const segmentHeight = height / count
  const overlap = segmentHeight * VOCABULARY_TILE_OVERLAP_RATIO
  return Array.from({ length: count }, (_, index) => {
    const sourceY = Math.max(0, index * segmentHeight - (index === 0 ? 0 : overlap / 2))
    const sourceEnd = Math.min(height, (index + 1) * segmentHeight + (index === count - 1 ? 0 : overlap / 2))
    return { index, sourceX: 0, sourceY, sourceWidth: width, sourceHeight: sourceEnd - sourceY }
  })
}

export function estimateVocabularyImageSharpness(data: Uint8ClampedArray, width: number, height: number): number | null {
  if (width < 3 || height < 3 || data.length < width * height * 4) return null
  const gray = (x: number, y: number) => {
    const offset = (y * width + x) * 4
    return data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114
  }
  let count = 0; let sum = 0; let squared = 0
  for (let y = 1; y < height - 1; y += 2) for (let x = 1; x < width - 1; x += 2) {
    const value = 4 * gray(x, y) - gray(x - 1, y) - gray(x + 1, y) - gray(x, y - 1) - gray(x, y + 1)
    count += 1; sum += value; squared += value * value
  }
  if (!count) return null
  const mean = sum / count
  return squared / count - mean * mean
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("image_encode_failed")), mime, mime === "image/png" ? undefined : 0.94))
}

async function decodeVocabularyImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file)
    return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() }
  }
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.decoding = "async"
  image.src = url
  await image.decode()
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, cleanup: () => URL.revokeObjectURL(url) }
}

export async function prepareVocabularyImage(file: File, crop: VocabularyCropRect = FULL_VOCABULARY_CROP): Promise<PreparedVocabularyImage> {
  const decoded = await decodeVocabularyImage(file)
  try {
    const normalizedCrop = normalizeVocabularyCrop(crop)
    const cropX = Math.round(decoded.width * normalizedCrop.left)
    const cropY = Math.round(decoded.height * normalizedCrop.top)
    const cropWidth = Math.max(1, Math.round(decoded.width * (normalizedCrop.right - normalizedCrop.left)))
    const cropHeight = Math.max(1, Math.round(decoded.height * (normalizedCrop.bottom - normalizedCrop.top)))
    const count = chooseVocabularyTileCount(cropWidth, cropHeight)
    const regions = buildVocabularyTileRegions(cropWidth, cropHeight, count)
    const outputMime = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg"
    const tiles: File[] = []
    for (const region of regions) {
      const scale = Math.min(1, VOCABULARY_TILE_MAX_WIDTH / region.sourceWidth)
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(region.sourceWidth * scale))
      canvas.height = Math.max(1, Math.round(region.sourceHeight * scale))
      const context = canvas.getContext("2d", { alpha: false })
      if (!context) throw new Error("canvas_unavailable")
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = "high"
      context.drawImage(decoded.source, cropX + region.sourceX, cropY + region.sourceY, region.sourceWidth, region.sourceHeight, 0, 0, canvas.width, canvas.height)
      const blob = await canvasToBlob(canvas, outputMime)
      const extension = outputMime === "image/png" ? "png" : outputMime === "image/webp" ? "webp" : "jpg"
      tiles.push(new File([blob], `vocabulary-tile-${region.index}.${extension}`, { type: outputMime }))
    }

    const sampleScale = Math.min(1, 320 / cropWidth)
    const sample = document.createElement("canvas")
    sample.width = Math.max(3, Math.round(cropWidth * sampleScale))
    sample.height = Math.max(3, Math.round(cropHeight * sampleScale))
    const sampleContext = sample.getContext("2d", { willReadFrequently: true })
    let sharpness: number | null = null
    if (sampleContext) {
      sampleContext.drawImage(decoded.source, cropX, cropY, cropWidth, cropHeight, 0, 0, sample.width, sample.height)
      sharpness = estimateVocabularyImageSharpness(sampleContext.getImageData(0, 0, sample.width, sample.height).data, sample.width, sample.height)
    }
    return { tiles, quality: { width: cropWidth, height: cropHeight, aspectRatio: cropHeight / cropWidth, tileCount: count, partitioned: count > 1, sharpness, blurry: sharpness !== null && sharpness < 45 } }
  } finally { decoded.cleanup() }
}
