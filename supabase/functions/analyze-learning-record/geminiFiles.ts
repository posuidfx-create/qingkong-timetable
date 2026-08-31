export interface GeminiUploadedFile {
  name: string
  uri: string
  mimeType: string
}

export class GeminiFileApiError extends Error {
  constructor(public readonly stage: "upload_start" | "upload_bytes" | "delete", public readonly status: number | null) { super(`gemini_file_${stage}`) }
}

export type GeminiFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

function normalizedMime(mimeType: string): string {
  return mimeType.toLowerCase().split(";")[0]?.trim() ?? "application/octet-stream"
}

export async function uploadGeminiFile(apiKey: string, displayName: string, mimeType: string, bytes: Uint8Array, fetcher: GeminiFetch = fetch): Promise<GeminiUploadedFile> {
  const mime = normalizedMime(mimeType)
  const start = await fetcher("https://generativelanguage.googleapis.com/upload/v1beta/files", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Header-Content-Type": mime,
    },
    body: JSON.stringify({ file: { display_name: displayName.slice(0, 512) } }),
  })
  if (!start.ok) throw new GeminiFileApiError("upload_start", start.status)
  const uploadUrl = start.headers.get("x-goog-upload-url")
  if (!uploadUrl) throw new GeminiFileApiError("upload_start", null)

  const uploaded = await fetcher(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.byteLength),
      "Content-Type": mime,
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Uint8Array(bytes).buffer,
  })
  if (!uploaded.ok) throw new GeminiFileApiError("upload_bytes", uploaded.status)
  const payload: unknown = await uploaded.json()
  const file = payload && typeof payload === "object" && "file" in payload ? (payload as { file?: unknown }).file : null
  if (!file || typeof file !== "object") throw new GeminiFileApiError("upload_bytes", null)
  const row = file as Record<string, unknown>
  if (typeof row.name !== "string" || !row.name.startsWith("files/") || typeof row.uri !== "string") throw new GeminiFileApiError("upload_bytes", null)
  return { name: row.name, uri: row.uri, mimeType: typeof row.mimeType === "string" ? row.mimeType : typeof row.mime_type === "string" ? row.mime_type : mime }
}

export async function deleteGeminiFile(apiKey: string, file: Pick<GeminiUploadedFile, "name">, fetcher: GeminiFetch = fetch): Promise<void> {
  if (!/^files\/[a-z0-9-]+$/i.test(file.name)) throw new GeminiFileApiError("delete", null)
  const removed = await fetcher(`https://generativelanguage.googleapis.com/v1beta/${file.name}`, { method: "DELETE", headers: { "x-goog-api-key": apiKey } })
  if (!removed.ok) throw new GeminiFileApiError("delete", removed.status)
}

export async function withGeminiUploadedFile<T>(operations: {
  upload: () => Promise<GeminiUploadedFile>
  use: (file: GeminiUploadedFile) => Promise<T>
  cleanup: (file: GeminiUploadedFile) => Promise<void>
  onCleanupError?: (reason: unknown) => void
}): Promise<T> {
  let uploaded: GeminiUploadedFile | null = null
  try {
    uploaded = await operations.upload()
    return await operations.use(uploaded)
  } finally {
    if (uploaded) {
      try { await operations.cleanup(uploaded) }
      catch (reason) { operations.onCleanupError?.(reason) }
    }
  }
}
