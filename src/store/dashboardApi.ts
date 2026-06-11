import api from "./api"

export type DashboardOwnership = "owned" | "shared"
export type DashboardAccessLevel = "owner" | "editor" | "viewer"
export type DashboardSort =
  | "name_asc"
  | "name_desc"
  | "date_newest"
  | "date_oldest"
  | "size_asc"
  | "size_desc"
  | "type_asc"

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
  ownership: DashboardOwnership
  accessLevel: DashboardAccessLevel
  permissionStatus: string
  createdAt: string
  sharedAt?: string
  collaborators: DashboardCollaborator[]
}

export interface DashboardStats {
  totalDocuments: number
  uploadedCount: number
  sharedWithMeCount: number
  sharedByMeCount: number
  totalStorageBytes: number
  fileTypes: Record<string, number>
}

export interface DashboardActivity {
  id: string
  type: "uploaded" | "shared_with_me" | "shared_by_me"
  message: string
  fileId: string
  fileName: string
  createdAt: string
}

export interface DashboardOverview {
  documents: DashboardDocument[]
  uploadedFiles: DashboardDocument[]
  sharedFiles: DashboardDocument[]
  stats: DashboardStats
  recentActivity: DashboardActivity[]
}

export interface DashboardFilters {
  q?: string
  type?: string
  ownership?: "all" | DashboardOwnership
  sort?: DashboardSort
}

function dashboardParams(filters: DashboardFilters) {
  const params = new URLSearchParams()

  if (filters.q) params.set("q", filters.q)
  if (filters.type && filters.type !== "all") params.set("type", filters.type)
  if (filters.ownership && filters.ownership !== "all") {
    params.set("ownership", filters.ownership)
  }
  if (filters.sort) params.set("sort", filters.sort)

  return params.toString()
}

export async function getDashboardOverview(filters: DashboardFilters = {}) {
  const query = dashboardParams(filters)
  const res = await api.get<DashboardOverview>(
    query ? `/dashboard?${query}` : "/dashboard",
  )

  return res.data
}

export async function getDashboardDocuments(filters: DashboardFilters = {}) {
  const query = dashboardParams(filters)
  const res = await api.get<{ documents: DashboardDocument[] }>(
    query ? `/dashboard/documents?${query}` : "/dashboard/documents",
  )

  return res.data.documents
}
