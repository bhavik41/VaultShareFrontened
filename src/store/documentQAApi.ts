import api from "./api";

export interface QAResult {
  answer: string;
  chunksUsed: number;
  totalChunks: number;
}

export async function askDocumentQuestion(fileId: string, question: string): Promise<QAResult> {
  const res = await api.post<QAResult>(`/files/${fileId}/ask`, { question });
  return res.data;
}
