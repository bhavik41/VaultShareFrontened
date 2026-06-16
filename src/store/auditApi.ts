import axios from "axios"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5003/api"

export type AuditAction =
  | "upload"
  | "download"
  | "view"
  | "share"
  | "permission_change"
  | "delete"
  | "revoke_access"
  | "star"
  | "invitation_accepted"

export interface AuditLog {
  id: string
  fileId: string
  userId: string
  userName: string
  userEmail: string
  fileOwnerName: string
  fileOwnerId: string
  action: AuditAction
  details?: string
  timestamp: string
}

export interface AuditSummary {
  totalEvents: number
  byAction: Record<AuditAction, number>
  uniqueUsers: number
  lastActivityAt: string | null
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

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getFileAuditHistory(
  fileId: string,
  limit = 20,
  offset = 0,
  action?: AuditAction,
): Promise<{ logs: AuditLog[]; total: number; fileOwnerName: string; fileOwnerId: string; summary: AuditSummary }> {
  const params: Record<string, string | number> = { limit, offset }
  if (action) params.action = action
  const res = await axios.get(`${API}/files/${fileId}/audit`, {
    params,
    headers: getAuthHeaders(),
  })
  return res.data
}

export async function getMyActivity(opts?: {
  actions?: AuditAction[]
  limit?: number
  offset?: number
}): Promise<{ activities: UserActivity[]; total: number }> {
  const params: Record<string, string | number> = {
    limit: opts?.limit ?? 30,
    offset: opts?.offset ?? 0,
  }
  if (opts?.actions?.length) params.actions = opts.actions.join(",")
  const res = await axios.get(`${API}/audit/my-activity`, {
    params,
    headers: getAuthHeaders(),
  })
  return res.data
}

export async function getAuditStats(): Promise<{
  totalEvents: number
  todayEvents: number
  topAction: AuditAction | null
}> {
  const res = await axios.get(`${API}/audit/stats`, { headers: getAuthHeaders() })
  return res.data
}

const seenLogIds = new Set<string>()
export function deduplicateLogs<T extends { id: string }>(logs: T[]): T[] {
  return logs.filter((l) => {
    if (seenLogIds.has(l.id)) return false
    seenLogIds.add(l.id)
    return true
  })
}
