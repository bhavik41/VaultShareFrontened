import axios from "axios"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5003/api"

function getAuthHeaders() {
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type SharedRole = "editor" | "viewer"

export interface CollaborationRole {
  userId: string
  fileId: string
  role: SharedRole
  name: string
  email: string
}

export interface CollaborationInvitation {
  id: string
  fileName?: string
  inviterName: string
  inviterEmail?: string
  inviteeEmail?: string
  role: string
  status: "pending" | "accepted" | "rejected"
  createdAt: string
  respondedAt?: string
}

export interface SharedFile {
  id: string
  name: string
  mimeType: string
  size: number
  ownerName: string
  ownerEmail: string
  role: string
  sharedAt: string
  createdAt: string
}

export interface SharedUser {
  id: string
  userId: string
  fileId: string
  name: string
  email: string
  role: SharedRole
  createdAt: string
  updatedAt: string
}

export type ShareLinkPermissionMode =
  | "viewer"
  | "editor"
  | "download"
  | "admin-download"

export interface ShareLink {
  id: string
  fileId: string
  token: string
  permissionMode: ShareLinkPermissionMode
  expiresAt: string
  revokedAt: string | null
  createdAt: string
  passwordProtected: boolean
}

export interface ShareLinkFile {
  id: string
  name: string
  mimeType: string
  size: number
  ownerId: string
  ownerName: string
  ownerEmail: string
  permissionMode: ShareLinkPermissionMode
  createdAt: string
}

// ── Invitation functions ──────────────────────────────────────────────────────

export async function getMyInvitations(): Promise<CollaborationInvitation[]> {
  const res = await axios.get(`${API}/collaboration/invitations`, {
    headers: getAuthHeaders(),
  })
  return res.data.invitations ?? []
}

export async function getFileInvitations(fileId: string): Promise<CollaborationInvitation[]> {
  const res = await axios.get(`${API}/collaboration/files/${fileId}/invitations`, {
    headers: getAuthHeaders(),
  })
  return res.data.invitations ?? []
}

export async function inviteCollaborator(
  fileId: string,
  body: { inviteeEmail: string; role: SharedRole },
): Promise<void> {
  await axios.post(
    `${API}/collaboration/files/${fileId}/invitations`,
    body,
    { headers: getAuthHeaders() },
  )
}

export async function respondToInvitation(
  invitationId: string,
  status: "accepted" | "rejected",
): Promise<void> {
  await axios.patch(
    `${API}/collaboration/invitations/${invitationId}/respond`,
    { status },
    { headers: getAuthHeaders() },
  )
}

// ── Shared-user functions ─────────────────────────────────────────────────────

export async function getSharedUsers(fileId: string): Promise<SharedUser[]> {
  const res = await axios.get(`${API}/collaboration/files/${fileId}/shared-users`, {
    headers: getAuthHeaders(),
  })
  return res.data.collaborators ?? []
}

export async function shareFileWithUser(
  fileId: string,
  body: { collaboratorEmail: string; role: SharedRole },
): Promise<void> {
  await axios.post(
    `${API}/collaboration/files/${fileId}/share`,
    body,
    { headers: getAuthHeaders() },
  )
}

export async function updateCollaboratorPermission(
  fileId: string,
  userId: string,
  role: SharedRole,
): Promise<void> {
  await axios.patch(
    `${API}/collaboration/files/${fileId}/collaborators/${userId}`,
    { role },
    { headers: getAuthHeaders() },
  )
}

export async function removeCollaborator(
  fileId: string,
  userId: string,
): Promise<void> {
  await axios.delete(
    `${API}/collaboration/files/${fileId}/collaborators/${userId}`,
    { headers: getAuthHeaders() },
  )
}

export async function getFilesSharedWithMe(): Promise<SharedFile[]> {
  const res = await axios.get(`${API}/collaboration/shared-with-me`, {
    headers: getAuthHeaders(),
  })
  return res.data.files ?? []
}

// ── Share-link functions ──────────────────────────────────────────────────────

export async function getShareLinks(fileId: string): Promise<ShareLink[]> {
  const res = await axios.get(`${API}/collaboration/files/${fileId}/share-links`, {
    headers: getAuthHeaders(),
  })
  return res.data.shareLinks ?? []
}

export async function createShareLink(
  fileId: string,
  body: { permissionMode: ShareLinkPermissionMode; expiresAt?: string; password?: string },
): Promise<ShareLink> {
  const res = await axios.post(
    `${API}/collaboration/files/${fileId}/share-links`,
    body,
    { headers: getAuthHeaders() },
  )
  return res.data.shareLink
}

export async function unlockShareLink(
  token: string,
  password: string,
): Promise<string> {
  const res = await axios.post(`${API}/collaboration/share-links/${token}/unlock`, { password })
  return res.data.unlockToken
}

export async function revokeShareLink(token: string): Promise<void> {
  await axios.delete(
    `${API}/collaboration/share-links/${token}`,
    { headers: getAuthHeaders() },
  )
}

export async function validateShareLink(
  token: string,
): Promise<{ shareLink: ShareLink; file: ShareLinkFile }> {
  const res = await axios.get(`${API}/collaboration/share-links/${token}`)
  return { shareLink: res.data.shareLink, file: res.data.file }
}

// ── Legacy aliases ────────────────────────────────────────────────────────────

export const getFileCollaborators = getSharedUsers
export const changeCollaboratorRole = (fileId: string, userId: string, role: SharedRole) =>
  updateCollaboratorPermission(fileId, userId, role)
export const revokeCollaboratorAccess = removeCollaborator
