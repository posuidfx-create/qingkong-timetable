import { CHAT_MESSAGE_TYPES, type ChatAttachment, type ChatMessageType, type ChatRoomType } from "@/types/chat"

export const CHAT_MEDIA_LIMITS = { image: 10 * 1024 * 1024, file: 20 * 1024 * 1024, audio: 20 * 1024 * 1024, video: 50 * 1024 * 1024 } as const
const recordedDurationByFile = new WeakMap<File, number>()
const preferredKindByFile = new WeakMap<File, Exclude<ChatMessageType, "text">>()

const imageMimes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const audioMimes = new Set(["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav"])
const videoMimes = new Set(["video/mp4", "video/webm", "video/quicktime"])
const fileMimes = new Set(["application/pdf", "application/zip", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"])
const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm", "mov", "ogg", "mp3", "m4a", "wav", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip"])
const dangerousExtensions = new Set(["html", "htm", "svg", "js", "mjs", "exe", "bat", "cmd", "ps1", "apk", "dmg", "sh"])
const mimeByExtension: Record<string, string> = { txt: "text/plain", pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", zip: "application/zip" }

export interface PreparedChatAttachment extends ChatAttachment { file: File }
export interface ChatAttachmentDraft { file: File; kind: Exclude<ChatMessageType, "text">; name: string; mime: string; size: number }

function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? ""
}

export function normalizeMimeType(mime: string): string {
  return mime.toLowerCase().split(";", 1)[0]?.trim() ?? ""
}

export function resolveAttachmentMime(file: Pick<File, "type" | "name">, preferredKind?: Exclude<ChatMessageType, "text">): string | null {
  const fallback = mimeByExtension[extensionOf(file.name)]
  const normalized = normalizeMimeType(file.type)
  if (preferredKind === "audio") return normalized.startsWith("audio/") ? normalized : ({ webm: "audio/webm", ogg: "audio/ogg", m4a: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav" }[extensionOf(file.name)] ?? null)
  return normalized || fallback || null
}

export function getChatMessageType(file: Pick<File, "type" | "name">, preferredKind?: Exclude<ChatMessageType, "text">): Exclude<ChatMessageType, "text"> | null {
  const extension = extensionOf(file.name)
  if (dangerousExtensions.has(extension) || !allowedExtensions.has(extension)) return null
  if (preferredKind === "audio") return "audio"
  const mime = resolveAttachmentMime(file, preferredKind)
  if (!mime) return null
  if (imageMimes.has(mime)) return "image"
  if (audioMimes.has(mime)) return "audio"
  if (videoMimes.has(mime)) return "video"
  return fileMimes.has(mime) ? "file" : null
}

export function buildAttachmentMetadata(file: Pick<File, "type" | "name" | "size">, preferredKind = preferredKindByFile.get(file as File)): { messageType: Exclude<ChatMessageType, "text">; attachmentName: string; attachmentMime: string; attachmentSize: number } | null {
  const messageType = getChatMessageType(file, preferredKind)
  const attachmentMime = resolveAttachmentMime(file, preferredKind)
  if (!messageType || !attachmentMime) return null
  if (!Number.isFinite(file.size) || file.size <= 0) throw new Error("附件大小信息丢失。")
  return { messageType, attachmentName: sanitizeAttachmentName(file.name), attachmentMime, attachmentSize: file.size }
}

export function createAttachmentDraft(file: File, preferredKind = preferredKindByFile.get(file)): ChatAttachmentDraft {
  const metadata = buildAttachmentMetadata(file, preferredKind)
  if (!metadata) throw new Error("无法识别该文件类型，请选择其他文件。")
  return { file, kind: metadata.messageType, name: metadata.attachmentName, mime: metadata.attachmentMime, size: file.size }
}

export function logAttachmentFileDiagnostics(stage: "selected" | "draft" | "upload", file: Pick<File, "name" | "size" | "type">, draft?: Omit<ChatAttachmentDraft, "file">): void {
  if (!import.meta.env.DEV) return
  if (stage === "selected") console.info("[chat attachment] selected", { fileName: file.name, fileSize: file.size, fileSizeType: typeof file.size, fileType: file.type })
  else if (stage === "draft" && draft) console.info("[chat attachment] draft", { draftName: draft.name, draftSize: draft.size, draftSizeType: typeof draft.size, draftMime: draft.mime, draftKind: draft.kind })
  else console.info("[chat attachment] upload metadata", { metadataName: draft?.name, metadataSize: draft?.size, metadataSizeType: typeof draft?.size, metadataMime: draft?.mime, metadataKind: draft?.kind })
}

export function validateChatAttachment(file: Pick<File, "type" | "name" | "size">): { type: Exclude<ChatMessageType, "text">; error: null } | { type: null; error: string } {
  const metadata = buildAttachmentMetadata(file)
  if (!metadata) return { type: null, error: "无法识别该文件类型，请选择其他文件。" }
  const type = metadata.messageType
  if (file.size > CHAT_MEDIA_LIMITS[type]) return { type: null, error: `${type === "image" ? "图片" : type === "audio" ? "音频" : type === "video" ? "视频" : "文件"}不能超过 ${CHAT_MEDIA_LIMITS[type] / 1024 / 1024} MB。` }
  return { type, error: null }
}

export function sanitizeAttachmentName(name: string): string {
  const controlCharacters = Array.from({ length: 32 }, (_, index) => String.fromCharCode(index)).join("")
  const unsafeCharacters = new RegExp(`[${controlCharacters}\\\\/:*?"<>|]`, "g")
  const cleaned = name.replace(unsafeCharacters, " ").replace(/\.\.+/g, ".").trim().slice(0, 120)
  return cleaned || "附件"
}

export function createPrivateConversationKey(firstUserId: string, secondUserId: string): string {
  return [firstUserId, secondUserId].sort().join("--")
}

export function createChatAttachmentPath(scope: { kind: "group"; roomType: ChatRoomType } | { kind: "private"; otherUserId: string }, userId: string, file: Pick<File, "name">, objectId: string): string {
  const extension = extensionOf(file.name)
  const safeExtension = allowedExtensions.has(extension) ? extension : "bin"
  return scope.kind === "group" ? `group/${scope.roomType}/${userId}/${objectId}.${safeExtension}` : `private/${createPrivateConversationKey(userId, scope.otherUserId)}/${userId}/${objectId}.${safeExtension}`
}

export function formatAttachmentSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`
}

export function isChatMessageType(value: unknown): value is ChatMessageType {
  return typeof value === "string" && CHAT_MESSAGE_TYPES.includes(value as ChatMessageType)
}

export function canRecordChatAudio(mediaDevices: MediaDevices | undefined, recorder: typeof MediaRecorder | undefined): boolean {
  return Boolean(mediaDevices?.getUserMedia && recorder)
}

export function setChatRecordingDuration(file: File, duration: number): void { recordedDurationByFile.set(file, duration) }
export function getChatRecordingDuration(file: File): number | null { return recordedDurationByFile.get(file) ?? null }
export function setChatPreferredKind(file: File, kind: Exclude<ChatMessageType, "text">): void { preferredKindByFile.set(file, kind) }
