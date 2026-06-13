import api from "./api"

export interface DashboardCollaborator {
  id: string
  userId: string
  name: string
  email: string
  role: "editor" | "viewer"
}

export interface DashboardDocument {
  id: string
  name: string
  mimeType: string
  size: number
  ownerId: string
  ownerName: string
  ownerEmail: string
  ownership: "owned" | "shared"
  accessLevel: "owner" | "editor" | "viewer"
  permissionStatus: string
  createdAt: string
  sharedAt?: string
  collaborators: DashboardCollaborator[]
}

export async function getDashboardDocuments(): Promise<DashboardDocument[]> {
  const res = await api.get<{ documents: DashboardDocument[] }>("/dashboard/documents")
  return res.data.documents
}
