// src/types/chat.ts

export interface ChatMessage {
  id: string;
  fileId: string;
  userId: string;
  userName: string;
  userEmail: string;
  content: string;
  timestamp: string; // ISO string
}

export interface OnlineUser {
  userId: string;
  userName: string;
  socketId: string;
}

export interface ChatState {
  messagesByFile: Record<string, ChatMessage[]>;
  onlineUsersByFile: Record<string, OnlineUser[]>;
  typingByFile: Record<string, string[]>; // fileId -> list of userNames currently typing
  unreadCountByFile: Record<string, number>;
  loading: boolean;
  error: string | null;
}
