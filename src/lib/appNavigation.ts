export type PrimaryPage = "timetable" | "learning" | "chat" | "todo" | "statistics" | "profile" | "changelog" | "about"

export const primaryPagePaths: Readonly<Record<PrimaryPage, string>> = {
  timetable: "/",
  learning: "/learning",
  chat: "/chat",
  todo: "/todo",
  statistics: "/statistics",
  profile: "/profile",
  changelog: "/changelog",
  about: "/about",
}

export function getPrimaryPageFromPath(pathname: string): PrimaryPage {
  if (pathname === primaryPagePaths.learning || pathname.startsWith(`${primaryPagePaths.learning}/`)) return "learning"
  return (Object.entries(primaryPagePaths).find(([, path]) => path === pathname)?.[0] as PrimaryPage | undefined) ?? "timetable"
}
