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
  return token ? { Authorization: Bearer  } : {}
}

export async function getDashboardDocuments(): Promise<DashboardDocument[]> {
  const res = await axios.get(${API}/api/dashboard/documents, { headers: getAuthHeaders() })
  return res.data.documents ?? []
}
