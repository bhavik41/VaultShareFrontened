import api from "./api"

export type VersionPolicy = "admin_only" | "role_gated" | "open"
export type VersionUploadMode = "direct" | "request" | "denied"

export interface FileVersion {
  id: string
  fileId: string
  versionNumber: number
  uploadedBy: string
  originalName: string
  size: number
  mimeType: string
  changeNote?: string
  isActive: boolean
  isEncrypted: boolean
  createdAt: string
}

export type VersionRequestStatus = "pending" | "approved" | "rejected"

export interface VersionRequest {
  id: string
  fileId: string
  requestedBy: string
  size: number
  mimeType: string
  isEncrypted: boolean
  originalName: string
  changeNote?: string
  status: VersionRequestStatus
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

export async function getVersions(fileId: string): Promise<FileVersion[]> {
  const res = await api.get<{ versions: FileVersion[] }>(`/files/${fileId}/versions`)
  return res.data.versions
}

export async function uploadVersion(
  fileId: string,
  file: File,
  options: { changeNote?: string; encrypted?: boolean; originalMimeType?: string } = {},
): Promise<FileVersion> {
  const formData = new FormData()
  formData.append("file", file)
  if (options.changeNote) formData.append("changeNote", options.changeNote)
  if (options.encrypted) formData.append("encrypted", "true")
  if (options.originalMimeType) formData.append("originalMimeType", options.originalMimeType)

  const res = await api.post<{ version: FileVersion }>(`/files/${fileId}/versions`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data.version
}

export async function requestVersionUpload(
  fileId: string,
  file: File,
  options: { changeNote?: string; encrypted?: boolean; originalMimeType?: string } = {},
): Promise<VersionRequest> {
  const formData = new FormData()
  formData.append("file", file)
  if (options.changeNote) formData.append("changeNote", options.changeNote)
  if (options.encrypted) formData.append("encrypted", "true")
  if (options.originalMimeType) formData.append("originalMimeType", options.originalMimeType)

  const res = await api.post<{ request: VersionRequest }>(`/files/${fileId}/versions/request`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data.request
}

export async function getPendingRequests(fileId: string): Promise<VersionRequest[]> {
  const res = await api.get<{ requests: VersionRequest[] }>(`/files/${fileId}/versions/requests`)
  return res.data.requests
}

export async function getMyPendingRequest(fileId: string): Promise<VersionRequest | null> {
  const res = await api.get<{ request: VersionRequest | null }>(`/files/${fileId}/versions/my-request`)
  return res.data.request
}

export async function getMyRejectedRequests(fileId: string): Promise<VersionRequest[]> {
  const res = await api.get<{ requests: VersionRequest[] }>(`/files/${fileId}/versions/my-rejected`)
  return res.data.requests
}

export async function getPendingRequestsForOwner(): Promise<VersionRequest[]> {
  const res = await api.get<{ requests: VersionRequest[] }>(`/version-requests`)
  return res.data.requests
}

export async function approveVersionRequest(fileId: string, requestId: string): Promise<FileVersion> {
  const res = await api.post<{ version: FileVersion }>(
    `/files/${fileId}/versions/requests/${requestId}/approve`,
  )
  return res.data.version
}

export async function rejectVersionRequest(fileId: string, requestId: string): Promise<VersionRequest> {
  const res = await api.post<{ request: VersionRequest }>(
    `/files/${fileId}/versions/requests/${requestId}/reject`,
  )
  return res.data.request
}

export async function activateVersion(fileId: string, versionId: string): Promise<FileVersion> {
  const res = await api.patch<{ version: FileVersion }>(`/files/${fileId}/versions/${versionId}/activate`)
  return res.data.version
}

export async function deleteVersion(fileId: string, versionId: string): Promise<void> {
  await api.delete(`/files/${fileId}/versions/${versionId}`)
}

export async function updateVersionPolicy(fileId: string, versionPolicy: VersionPolicy): Promise<VersionPolicy> {
  const res = await api.patch<{ versionPolicy: VersionPolicy }>(`/files/${fileId}/version-policy`, {
    versionPolicy,
  })
  return res.data.versionPolicy
}

export async function downloadVersion(fileId: string, versionId: string, fileName: string): Promise<void> {
  const res = await api.get<Blob>(`/files/${fileId}/versions/${versionId}/download`, {
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
