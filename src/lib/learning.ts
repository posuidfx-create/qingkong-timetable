import { BookMarked, BookOpen, ClipboardPenLine, Languages, Trophy, type LucideIcon } from "lucide-react"

export interface LearningCard {
  title: "今日记录" | "课程档案" | "单词本" | "学习成果" | "成长时间线"
  description: string
  icon: LucideIcon
}

export const learningCards: readonly LearningCard[] = [
  { title: "今日记录", description: "记录今天的课堂、笔记与学习资料", icon: ClipboardPenLine },
  { title: "课程档案", description: "按课程整理学习过程与成果", icon: BookOpen },
  { title: "单词本", description: "整理每节课学习过的单词", icon: Languages },
  { title: "学习成果", description: "保存作业、作品与阶段成果", icon: Trophy },
  { title: "成长时间线", description: "回顾自己的长期学习轨迹", icon: BookMarked },
]
