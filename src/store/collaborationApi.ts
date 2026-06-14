import axios from "axios"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

function getAuthHeaders() {
  const token = localStorage.getItem("token")
  return token ? { Authorization: Bearer  } : {}
}

export interface CollaborationRole {
  userId: string
  fileId: string
  role: "editor" | "viewer"
  name: string
  email: string
}

export async function changeCollaboratorRole(
  fileId: string,
  userId: string,
  role: "editor" | "viewer",
): Promise<void> {
  await axios.patch(
    ${API}/api/collaboration//role/,
    { role },
    { headers: getAuthHeaders() },
  )
}

export async function revokeCollaboratorAccess(
  fileId: string,
  userId: string,
): Promise<void> {
  await axios.delete(
    ${API}/api/collaboration//revoke/,
    { headers: getAuthHeaders() },
  )
}

export async function getFileCollaborators(fileId: string): Promise<CollaborationRole[]> {
  const res = await axios.get(${API}/api/collaboration//collaborators, {
    headers: getAuthHeaders(),
  })
  return res.data.collaborators ?? []
}
