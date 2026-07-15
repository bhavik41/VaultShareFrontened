import api from "./api"
import { decryptBuffer, loadKey, storeKey, KEY_NOT_FOUND_MESSAGE } from "@/utils/crypto"

export { KEY_NOT_FOUND_MESSAGE }

export interface UploadedFile {
  id: string
  userId: string
  name: string
  mimeType: string
  size: number
  url: string
  createdAt: string
  isEncrypted: boolean
  versionPolicy?: "admin_only" | "role_gated" | "open"
  activeVersionId?: string | null
}

export async function getMyFiles() {
  const res = await api.get<{ files: UploadedFile[] }>("/files")
  return res.data.files
}

// Fetches the file bytes (with auth) and returns a local object URL suitable
// for previewing in an <img>/<iframe>. The caller is responsible for revoking
// the returned URL when the preview is no longer needed.
export async function getFileSignedUrl(fileId: string) {
  const res = await api.get<Blob>(`/files/${fileId}/preview`, {
    responseType: "blob",
  })

  const url = window.URL.createObjectURL(res.data)
  return { url, expiresIn: 0 }
}

function triggerDownload(blob: Blob, fileName: string) {
  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = blobUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.URL.revokeObjectURL(blobUrl)
}

export async function downloadFile(
  fileId: string,
  fileName: string,
  opts?: { isEncrypted?: boolean; mimeType?: string },
) {
  const res = await api.get<Blob>(`/files/${fileId}/download`, {
    responseType: "blob",
  })

  let blob: Blob = res.data

  if (opts?.isEncrypted) {
    const keyBase64url = loadKey(fileId)
    if (!keyBase64url) {
      throw new Error(KEY_NOT_FOUND_MESSAGE)
    }
    const encBuffer = await blob.arrayBuffer()
    blob = await decryptBuffer(encBuffer, keyBase64url, opts.mimeType ?? "application/octet-stream")
  }

  triggerDownload(blob, fileName)
}

// Retries a failed encrypted download using a manually-provided key (the
// "Key not found" recovery flow). Persists the key via storeKey on success
// so future downloads of this file don't need it re-entered.
export async function downloadFileWithKey(
  fileId: string,
  fileName: string,
  keyBase64url: string,
  mimeType?: string,
) {
  const res = await api.get<Blob>(`/files/${fileId}/download`, {
    responseType: "blob",
  })
  const encBuffer = await res.data.arrayBuffer()

  let blob: Blob
  try {
    blob = await decryptBuffer(encBuffer, keyBase64url, mimeType ?? "application/octet-stream")
  } catch {
    throw new Error("This key couldn't decrypt the file. Check that you pasted it correctly.")
  }

  storeKey(fileId, keyBase64url)
  triggerDownload(blob, fileName)
}
