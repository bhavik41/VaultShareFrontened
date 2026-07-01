import api from "./api"

export type NotificationType = "version_request" | "version_approved" | "version_rejected"

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  fileId: string
  message: string
  read: boolean
  createdAt: string
}

export async function getNotifications(): Promise<AppNotification[]> {
  const res = await api.get<{ notifications: AppNotification[] }>("/notifications")
  return res.data.notifications
}

export async function markNotificationRead(notificationId: string): Promise<AppNotification> {
  const res = await api.patch<{ notification: AppNotification }>(`/notifications/${notificationId}/read`)
  return res.data.notification
}
