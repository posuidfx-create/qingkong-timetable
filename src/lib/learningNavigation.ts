export type LearningView = "hub" | "today" | "archive" | "timeline" | "words"

export type LearningRoute = { view: LearningView; courseKey: null } | { view: "course"; courseKey: string }

export const learningViewPaths: Readonly<Record<LearningView, string>> = {
  hub: "/learning",
  today: "/learning/today",
  archive: "/learning/archive",
  timeline: "/learning/timeline",
  words: "/vocabulary",
}

export function getLearningViewFromPath(pathname: string): LearningView {
  return (Object.entries(learningViewPaths).find(([, path]) => path === pathname)?.[0] as LearningView | undefined) ?? "hub"
}

export function getLearningRouteFromPath(pathname: string): LearningRoute {
  const match = pathname.match(/^\/learning\/course\/([^/]+)\/?$/)
  if (match?.[1]) {
    try { return { view: "course", courseKey: decodeURIComponent(match[1]) } } catch { return { view: "hub", courseKey: null } }
  }
  return { view: getLearningViewFromPath(pathname), courseKey: null }
}

export function getLearningCoursePath(courseKey: string): string {
  return `/learning/course/${encodeURIComponent(courseKey)}`
}
