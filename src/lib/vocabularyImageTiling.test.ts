import { describe, expect, it } from "vitest"

import { buildVocabularyTileRegions, chooseVocabularyTileCount, estimateVocabularyImageSharpness, normalizeVocabularyCrop, VOCABULARY_TILE_OVERLAP_RATIO } from "@/lib/vocabularyImageTiling"

describe("Vocabulary image tiling", () => {
  it("uses three to six vertical tiles based on aspect ratio", () => {
    expect(chooseVocabularyTileCount(1600, 1200)).toBe(3)
    expect(chooseVocabularyTileCount(1200, 1800)).toBe(4)
    expect(chooseVocabularyTileCount(1000, 2200)).toBe(5)
    expect(chooseVocabularyTileCount(900, 2600)).toBe(6)
  })

  it("covers the full image with approximately eight percent overlap and no clipped boundary", () => {
    const regions = buildVocabularyTileRegions(1200, 1800, 4)
    expect(regions).toHaveLength(4)
    expect(regions[0]?.sourceY).toBe(0)
    expect((regions.at(-1)?.sourceY ?? 0) + (regions.at(-1)?.sourceHeight ?? 0)).toBeCloseTo(1800)
    for (let index = 0; index < regions.length - 1; index += 1) {
      const current = regions[index]; const next = regions[index + 1]
      const overlap = current.sourceY + current.sourceHeight - next.sourceY
      expect(overlap).toBeCloseTo((1800 / 4) * VOCABULARY_TILE_OVERLAP_RATIO)
      expect(next.sourceY).toBeLessThan(current.sourceY + current.sourceHeight)
    }
  })

  it("normalizes a rectangular manual crop without allowing an empty area", () => {
    expect(normalizeVocabularyCrop({ left: -1, top: .2, right: .01, bottom: 2 })).toEqual({ left: 0, top: .2, right: .05, bottom: 1 })
  })

  it("provides a low-cost blur score from pixel data", () => {
    const flat = new Uint8ClampedArray(5 * 5 * 4).fill(120)
    expect(estimateVocabularyImageSharpness(flat, 5, 5)).toBe(0)
  })
})
