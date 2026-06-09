import api from "./api"

export type InvitationStatus = "pending" | "accepted" | "rejected"
export type CollaboratorRole = "owner" | "editor" | "viewer"
export type SharedRole = Exclude<CollaboratorRole, "owner">

export interface CollaborationInvitation {
  id: string
  fileId: string
  inviterId: string
  inviteeId: string
  inviteeEmail: string
  role: SharedRole
  status: InvitationStatus
  createdAt: string
  respondedAt?: string
  fileName?: string
  inviterName?: string
  inviterEmail?: string
}

export interface FileShare {
  id: string
  fileId: string
  ownerId: string
  userId: string
  role: SharedRole
  createdAt: string
  updatedAt: string
}

export interface SharedUser {
  id: string
  fileId: string
  userId: string
  name: string
  email: string
  role: SharedRole
  createdAt: string
  updatedAt: string
}

export interface SharedFile {
  id: string
  name: string
  mimeType: string
  size: number
  ownerId: string
  ownerName: string
  ownerEmail: string
  role: SharedRole
  createdAt: string
  sharedAt: string
}

export interface ShareLink {
  id: string
  fileId: string
  ownerId: string
  token: string
  role: SharedRole
  expiresAt: string
  revokedAt: string | null
  createdAt: string
}

export interface ShareLinkFile {
  id: string
  name: string
  mimeType: string
  size: number
  ownerId: string
  ownerName: string
  ownerEmail: string
  role: SharedRole
  createdAt: string
  url: string
}

export async function inviteCollaborator(
  fileId: string,
  data: { inviteeEmail: string; role: SharedRole },
) {
  const res = await api.post<{
    message: string
    invitation: CollaborationInvitation
  }>(`/collaboration/files/${fileId}/invitations`, data)

  return res.data
}

export async function getMyInvitations() {
  const res = await api.get<{
    invitations: CollaborationInvitation[]
  }>("/collaboration/invitations")

  return res.data.invitations
}

export async function getFileInvitations(fileId: string) {
  const res = await api.get<{
    invitations: CollaborationInvitation[]
  }>(`/collaboration/files/${fileId}/invitations`)

  return res.data.invitations
}

export async function respondToInvitation(
  invitationId: string,
  status: "accepted" | "rejected",
) {
  const res = await api.patch<{
    message: string
    invitation: CollaborationInvitation
    share: FileShare | null
  }>(`/collaboration/invitations/${invitationId}/respond`, { status })

  return res.data
}

export async function shareFileWithUser(
  fileId: string,
  data: { collaboratorEmail: string; role: SharedRole },
) {
  const res = await api.post<{
    message: string
    share: FileShare
  }>(`/collaboration/files/${fileId}/share`, data)

  return res.data
}

export async function getSharedUsers(fileId: string) {
  const res = await api.get<{
    collaborators: SharedUser[]
  }>(`/collaboration/files/${fileId}/shared-users`)

  return res.data.collaborators
}

export async function updateCollaboratorPermission(
  fileId: string,
  userId: string,
  role: SharedRole,
) {
  const res = await api.patch<{
    message: string
    share: FileShare
  }>(`/collaboration/files/${fileId}/collaborators/${userId}`, { role })

  return res.data
}

export async function removeCollaborator(fileId: string, userId: string) {
  const res = await api.delete<{
    message: string
  }>(`/collaboration/files/${fileId}/collaborators/${userId}`)

  return res.data
}

export async function getFilesSharedWithMe() {
  const res = await api.get<{
    files: SharedFile[]
  }>("/collaboration/shared-with-me")

  return res.data.files
}

export async function createShareLink(
  fileId: string,
  data: { role: SharedRole; expiresAt?: string },
) {
  const res = await api.post<{
    message: string
    shareLink: ShareLink
  }>(`/collaboration/files/${fileId}/share-links`, data)

  return res.data
}

export async function getShareLinks(fileId: string) {
  const res = await api.get<{
    shareLinks: ShareLink[]
  }>(`/collaboration/files/${fileId}/share-links`)

  return res.data.shareLinks
}

export async function revokeShareLink(token: string) {
  const res = await api.delete<{
    message: string
    shareLink: ShareLink
  }>(`/collaboration/share-links/${token}`)

  return res.data
}

export async function validateShareLink(token: string) {
  const res = await api.get<{
    message: string
    shareLink: ShareLink
    file: ShareLinkFile
  }>(`/collaboration/share-links/${token}`)

  return res.data
}