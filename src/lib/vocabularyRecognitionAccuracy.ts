export interface VocabularyRecognitionAccuracy {
  expectedCount: number
  actualCount: number
  correctCount: number
  missedTerms: string[]
  unexpectedTerms: string[]
  precision: number
  recall: number
}

const normalizeTerm = (term: string) => term.normalize("NFKC").trim().replace(/[\s・･]+/g, "").toLocaleLowerCase()

export function evaluateVocabularyRecognitionAccuracy(expectedTerms: readonly string[], actualTerms: readonly string[]): VocabularyRecognitionAccuracy {
  const expected = new Map<string, string>(expectedTerms.map((term): [string, string] => [normalizeTerm(term), term.trim()]).filter(([key]) => Boolean(key)))
  const actual = new Map<string, string>(actualTerms.map((term): [string, string] => [normalizeTerm(term), term.trim()]).filter(([key]) => Boolean(key)))
  const correctCount = [...actual.keys()].filter((key) => expected.has(key)).length
  const missedTerms = [...expected].filter(([key]) => !actual.has(key)).map(([, term]) => term)
  const unexpectedTerms = [...actual].filter(([key]) => !expected.has(key)).map(([, term]) => term)
  return {
    expectedCount: expected.size,
    actualCount: actual.size,
    correctCount,
    missedTerms,
    unexpectedTerms,
    precision: actual.size ? correctCount / actual.size : expected.size ? 0 : 1,
    recall: expected.size ? correctCount / expected.size : 1,
  }
}

export interface VocabularyRecognitionStability {
  runCount: number
  commonTerms: string[]
  unionCount: number
  stability: number
}

export function evaluateVocabularyRecognitionStability(runs: readonly (readonly string[])[]): VocabularyRecognitionStability {
  if (!runs.length) return { runCount: 0, commonTerms: [], unionCount: 0, stability: 1 }
  const normalizedRuns = runs.map((run) => new Map<string, string>(run.map((term): [string, string] => [normalizeTerm(term), term.trim()]).filter(([key]) => Boolean(key))))
  const union = new Map<string, string>(normalizedRuns.flatMap((run) => [...run]))
  const common = [...normalizedRuns[0]].filter(([key]) => normalizedRuns.every((run) => run.has(key)))
  return { runCount: runs.length, commonTerms: common.map(([, term]) => term), unionCount: union.size, stability: union.size ? common.length / union.size : 1 }
}
