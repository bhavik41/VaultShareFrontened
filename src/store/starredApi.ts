import axios from "axios"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5003/api"

function getAuthHeaders() {
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getStarredFileIds(): Promise<string[]> {
  const res = await axios.get(`${API}/starred`, { headers: getAuthHeaders() })
  return res.data.fileIds ?? []
}

export async function starFile(fileId: string): Promise<void> {
  await axios.post(`${API}/starred/${fileId}`, {}, { headers: getAuthHeaders() })
}

export async function unstarFile(fileId: string): Promise<void> {
  await axios.delete(`${API}/starred/${fileId}`, { headers: getAuthHeaders() })
}
