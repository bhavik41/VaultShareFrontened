import api from "./api";

export type AuditAction = 
  | "upload"
  | "download"
  | "view"
  | "share"
  | "permission_change"
  | "delete";

export interface AuditLog {
  id: string;
  fileId: string;
  userId: string;
  action: AuditAction;
  details?: string;
  timestamp: string;
}

export interface AuditHistoryResponse {
  logs: AuditLog[];
  total: number;
}

export async function getFileAuditHistory(
  fileId: string,
  limit: number = 50,
  offset: number = 0,
  action?: AuditAction
) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString()
  });

  if (action) {
    params.append("action", action);
  }

  const res = await api.get<AuditHistoryResponse>(`/files/${fileId}/audit?${params.toString()}`);
  return res.data;
}
