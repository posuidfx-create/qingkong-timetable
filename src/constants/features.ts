export function isLearningAiFeatureEnabled(value: unknown): boolean {
  return value === "true"
}

export const LEARNING_AI_ENABLED = isLearningAiFeatureEnabled(import.meta.env.VITE_LEARNING_AI_ENABLED)
