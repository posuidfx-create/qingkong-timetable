export type LearningView = "hub" | "today" | "archive" | "timeline"

export const learningViewPaths: Readonly<Record<LearningView, string>> = {
  hub: "/learning",
  today: "/learning/today",
  archive: "/learning/archive",
  timeline: "/learning/timeline",
}

export function getLearningViewFromPath(pathname: string): LearningView {
  return (Object.entries(learningViewPaths).find(([, path]) => path === pathname)?.[0] as LearningView | undefined) ?? "hub"
}
