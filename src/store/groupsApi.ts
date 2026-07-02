import axios from 'axios'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5001/api'

function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type GroupRole = 'viewer' | 'editor' | 'admin'
export type SharedRole = 'viewer' | 'editor'

export interface Group {
  id: string
  name: string
  description?: string
  ownerId: string
  defaultRole: SharedRole
  role: string
  memberCount: number
  createdAt: string
  updatedAt: string
}

export interface GroupMember {
  id: string
  userId: string
  name: string
  email: string
  role: GroupRole
  joinedAt: string
}

export interface GroupFile {
  id: string
  fileId: string
  groupId: string
  fileName: string
  mimeType: string
  size: number
  role: SharedRole
  sharedAt: string
}

export interface GroupDetail extends Omit<Group, 'role' | 'memberCount'> {
  ownerName: string
  ownerEmail: string
  members: GroupMember[]
  files: GroupFile[]
  memberCount: number
}

export interface GroupFileForMe {
  fileId: string
  fileName: string
  mimeType: string
  size: number
  groupId: string
  groupName: string
  role: SharedRole
  sharedAt: string
}

// ── Groups ─────────────────────────────────────────────────────────────────────

export async function createGroup(body: { name: string; description?: string; defaultRole?: SharedRole }): Promise<Group> {
  const res = await axios.post(`${API}/groups`, body, { headers: getAuthHeaders() })
  return res.data.group
}

export async function listGroups(): Promise<Group[]> {
  const res = await axios.get(`${API}/groups`, { headers: getAuthHeaders() })
  return res.data.groups ?? []
}

export async function getGroup(groupId: string): Promise<GroupDetail> {
  const res = await axios.get(`${API}/groups/${groupId}`, { headers: getAuthHeaders() })
  return res.data.group
}

export async function updateGroup(
  groupId: string,
  body: { name?: string; description?: string; defaultRole?: SharedRole },
): Promise<Group> {
  const res = await axios.put(`${API}/groups/${groupId}`, body, { headers: getAuthHeaders() })
  return res.data.group
}

export async function deleteGroup(groupId: string): Promise<void> {
  await axios.delete(`${API}/groups/${groupId}`, { headers: getAuthHeaders() })
}

// ── Members ────────────────────────────────────────────────────────────────────

export async function addMember(
  groupId: string,
  body: { email: string; role: GroupRole },
): Promise<GroupMember> {
  const res = await axios.post(`${API}/groups/${groupId}/members`, body, {
    headers: getAuthHeaders(),
  })
  return res.data.member
}

export async function listMembers(groupId: string): Promise<GroupMember[]> {
  const res = await axios.get(`${API}/groups/${groupId}/members`, { headers: getAuthHeaders() })
  return res.data.members ?? []
}

export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: GroupRole,
): Promise<GroupMember> {
  const res = await axios.patch(
    `${API}/groups/${groupId}/members/${userId}`,
    { role },
    { headers: getAuthHeaders() },
  )
  return res.data.member
}

export async function removeMember(groupId: string, userId: string): Promise<void> {
  await axios.delete(`${API}/groups/${groupId}/members/${userId}`, {
    headers: getAuthHeaders(),
  })
}

// ── File Sharing ───────────────────────────────────────────────────────────────

export async function shareFileWithGroup(
  groupId: string,
  body: { fileId: string; role: SharedRole },
): Promise<void> {
  await axios.post(`${API}/groups/${groupId}/files`, body, { headers: getAuthHeaders() })
}

export async function listGroupFiles(groupId: string): Promise<GroupFile[]> {
  const res = await axios.get(`${API}/groups/${groupId}/files`, { headers: getAuthHeaders() })
  return res.data.files ?? []
}

export async function updateGroupFilePermission(
  groupId: string,
  fileId: string,
  role: SharedRole,
): Promise<void> {
  await axios.patch(
    `${API}/groups/${groupId}/files/${fileId}`,
    { role },
    { headers: getAuthHeaders() },
  )
}

export async function removeGroupFile(groupId: string, fileId: string): Promise<void> {
  await axios.delete(`${API}/groups/${groupId}/files/${fileId}`, {
    headers: getAuthHeaders(),
  })
}

export async function getGroupFilesForMe(): Promise<GroupFileForMe[]> {
  const res = await axios.get(`${API}/groups/files-shared-with-me`, {
    headers: getAuthHeaders(),
  })
  return res.data.files ?? []
}
