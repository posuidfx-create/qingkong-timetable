export interface EditableProfileFields {
  username: string
  title: string | null
}

/** Normalize the only two fields that any profile-editing RPC accepts. */
export function normalizeEditableProfileFields(username: string | null | undefined, title: string | null | undefined): EditableProfileFields {
  const normalizedUsername = username?.trim() ?? ""
  if (normalizedUsername.length < 1 || normalizedUsername.length > 40) {
    throw new Error("昵称需为 1～40 个字符。")
  }

  const normalizedTitle = title?.trim() || null
  if (normalizedTitle !== null && normalizedTitle.length > 20) {
    throw new Error("头衔最多 20 个字符。")
  }

  return { username: normalizedUsername, title: normalizedTitle }
}
