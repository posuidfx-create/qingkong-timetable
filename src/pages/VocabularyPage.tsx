import { useEffect, useMemo, useState } from "react"

import { JapaneseLessonWorkspace } from "@/components/learning/JapaneseLessonWorkspace"
import { getVisibleCourses } from "@/data/builtinTimetables"
import { buildLearningCourseIndex, getLearningCourseOptions } from "@/lib/learningLibrary"
import { fetchLearningRecords } from "@/lib/learningService"
import { useTimetableStore } from "@/store/timetableStore"
import type { LearningRecord } from "@/types/learning"
import { getLessonNumberFromPath, getLessonPath } from "@/lib/japaneseLessons"

interface VocabularyPageProps {
  onOpenLearning: () => void
}

export function VocabularyPage({ onOpenLearning }: VocabularyPageProps) {
  const userCourses = useTimetableStore((state) => state.courses)
  const cohortYear = useTimetableStore((state) => state.settings.cohortYear)
  const [records, setRecords] = useState<LearningRecord[]>([])
  const [lessonNumber, setLessonNumber] = useState<number | null>(() => getLessonNumberFromPath(window.location.pathname))

  useEffect(() => {
    let active = true
    void fetchLearningRecords().then((items) => { if (active) setRecords(items) }).catch(() => undefined)
    return () => { active = false }
  }, [])

  useEffect(() => {
    const onPopState = () => setLessonNumber(getLessonNumberFromPath(window.location.pathname))
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const visibleCourses = useMemo(() => getVisibleCourses(cohortYear, userCourses), [cohortYear, userCourses])
  const courseOptions = useMemo(() => getLearningCourseOptions(buildLearningCourseIndex(visibleCourses, records)), [records, visibleCourses])

  const openLesson = (nextLesson: number) => {
    const path = getLessonPath(nextLesson)
    if (window.location.pathname !== path) window.history.pushState(null, "", path)
    setLessonNumber(nextLesson)
  }
  const openRoot = () => {
    if (window.location.pathname !== "/vocabulary") window.history.pushState(null, "", "/vocabulary")
    setLessonNumber(null)
  }

  return <JapaneseLessonWorkspace courseOptions={courseOptions} lessonNumber={lessonNumber} onBack={onOpenLearning} onOpenLesson={openLesson} onOpenRoot={openRoot} />
}
