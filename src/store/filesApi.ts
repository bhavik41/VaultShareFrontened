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