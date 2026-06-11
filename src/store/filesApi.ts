import api from "./api"

export interface UploadedFile {
  id: string
  name: string
  mimeType: string
  size: number
  url: string
  createdAt: string
}

export async function getMyFiles() {
  const res = await api.get<{ files: UploadedFile[] }>("/files")
  return res.data.files
}

export async function getFileSignedUrl(fileId: string) {
  const res = await api.get<{ url: string; expiresIn: number }>(
    `/files/${fileId}/signed-url`,
  )

  return res.data
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
