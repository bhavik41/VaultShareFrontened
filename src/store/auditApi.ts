import api from "./api"

export type AuditAction =
  | "upload"
  | "download"
  | "view"
  | "share"
  | "permission_change"
  | "delete"

export interface AuditLog {
  id: string
  fileId: string
  userId: string
  userName: string
  userEmail: string
  action: AuditAction
  details?: string
  ipAddress?: string
  userAgent?: string
  timestamp: string
  fileOwnerName: string
}

export interface AuditSummary {
  totalEvents: number
  byAction: Record<AuditAction, number>
  uniqueUsers: number
  lastActivityAt: string | null
}

export interface AuditHistoryResponse {
  logs: AuditLog[]
  total: number
  fileOwnerName: string
  fileOwnerId: string
  summary: AuditSummary
}

export interface UserActivity {
  id: string
  fileId: string
  userId: string
  action: AuditAction
  details?: string
  timestamp: string
  fileName: string
  mimeType: string
}

export async function getMyActivity(options?: {
  actions?: AuditAction[]
  limit?: number
  offset?: number
}) {
  const params = new URLSearchParams()
  if (options?.limit) params.set("limit", String(options.limit))
  if (options?.offset) params.set("offset", String(options.offset))
  if (options?.actions?.length) params.set("actions", options.actions.join(","))
  const res = await api.get<{ activities: UserActivity[]; total: number }>(
    `/audit/my-activity?${params.toString()}`,
  )
  return res.data
}

export async function getFileAuditHistory(
  fileId: string,
  limit: number = 50,
  offset: number = 0,
  action?: AuditAction,
) {
  const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() })
  if (action) params.append("action", action)
  const res = await api.get<AuditHistoryResponse>(`/files/${fileId}/audit?${params.toString()}`)
  return res.data
}
