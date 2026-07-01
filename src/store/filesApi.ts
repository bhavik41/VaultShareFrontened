import api from "./api"

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

export async function downloadFile(fileId: string, fileName: string) {
  const res = await api.get<Blob>(`/files/${fileId}/download`, {
    responseType: "blob",
  })

  const blobUrl = window.URL.createObjectURL(res.data)
  const link = document.createElement("a")

  link.href = blobUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.URL.revokeObjectURL(blobUrl)
}
