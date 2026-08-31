import { APP_VERSION_TAG } from "@/constants/appVersion"

export const SEEN_VERSION_STORAGE_KEY = "app_seen_version"
export const MAJOR_UPDATE_TITLE = `${APP_VERSION_TAG} 全新升级`
export const PWA_REINSTALL_NOTICE = "如果你之前已将网页添加到桌面作为 App 使用，请先删除旧 App，再在浏览器中打开最新版本，确认更新完成后重新添加到桌面。"
export const PWA_REINSTALL_NOTICE_JA = "以前このサイトをアプリとしてホーム画面／デスクトップに追加している場合は、旧アプリを一度削除し、ブラウザで最新版を開いて更新を確認した後、もう一度アプリとして追加してください。"

function parseVersion(value: string): number[] | null {
  const match = value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/)
  return match ? match.slice(1).map(Number) : null
}

export function isVersionOlder(value: string, current = APP_VERSION_TAG): boolean {
  const previous = parseVersion(value)
  const next = parseVersion(current)
  if (!previous || !next) return true
  for (let index = 0; index < next.length; index += 1) {
    if (previous[index] !== next[index]) return previous[index] < next[index]
  }
  return false
}

export function shouldShowMajorUpdate(storage: Pick<Storage, "getItem"> | undefined): boolean {
  const seenVersion = storage?.getItem(SEEN_VERSION_STORAGE_KEY)
  return !seenVersion || isVersionOlder(seenVersion)
}

export function markMajorUpdateSeen(storage: Pick<Storage, "setItem"> | undefined): string {
  storage?.setItem(SEEN_VERSION_STORAGE_KEY, APP_VERSION_TAG)
  return APP_VERSION_TAG
}
