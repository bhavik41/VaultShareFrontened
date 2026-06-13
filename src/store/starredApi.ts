import api from "./api"

export async function getStarredFileIds(): Promise<string[]> {
  const res = await api.get<{ starredFileIds: string[] }>("/starred")
  return res.data.starredFileIds
}

export async function starFile(fileId: string): Promise<void> {
  await api.post(`/starred/${fileId}`)
}

export async function unstarFile(fileId: string): Promise<void> {
  await api.delete(`/starred/${fileId}`)
}
