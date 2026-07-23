import axios from "axios"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export interface DashboardCollaborator {
  userId: string
  name: string
  role: string
}

export interface DashboardDocument {
  id: string
  name: string
  size: number
  mimeType: string
  createdAt: string
  ownership: "owned" | "shared"
  ownerName?: string
  accessLevel?: string
  collaborators: DashboardCollaborator[]
}

function getAuthHeaders() {
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getDashboardDocuments(): Promise<DashboardDocument[]> {
  const res = await axios.get(`${API}/dashboard/documents`, { headers: getAuthHeaders() })
  return res.data.documents ?? []
}

export interface TrashedFile {
  id: string
  name: string
  originalName: string
  size: number
  mimeType: string
  createdAt: string
  trashedAt: string
}

export async function getTrashedFiles(): Promise<TrashedFile[]> {
  const res = await axios.get(`${API}/files/trash`, { headers: getAuthHeaders() })
  return res.data.files ?? []
}

export async function restoreFileApi(fileId: string): Promise<void> {
  await axios.post(`${API}/files/${fileId}/restore`, {}, { headers: getAuthHeaders() })
}

export async function permanentlyDeleteFileApi(fileId: string): Promise<void> {
  await axios.delete(`${API}/files/${fileId}/permanent`, { headers: getAuthHeaders() })
}

export interface DashboardStats {
  totalDocuments: number
  uploadedCount: number
  sharedWithMeCount: number
  sharedByMeCount: number
  totalStorageBytes: number
  fileTypes: Record<string, number>
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await axios.get(`${API}/dashboard/stats`, { headers: getAuthHeaders() })
  return res.data.stats
}
