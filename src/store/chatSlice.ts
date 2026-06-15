// src/store/chatSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { ChatMessage, OnlineUser, ChatState } from "@/types/chat";

const initialState: ChatState = {
  messagesByFile: {},
  onlineUsersByFile: {},
  typingByFile: {},
  unreadCountByFile: {},
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage(
      state,
      action: PayloadAction<{ fileId: string; message: ChatMessage; isOpen?: boolean }>
    ) {
      const { fileId, message, isOpen } = action.payload;
      if (!state.messagesByFile[fileId]) {
        state.messagesByFile[fileId] = [];
      }
      // Avoid duplicates
      const exists = state.messagesByFile[fileId].some((m) => m.id === message.id);
      if (!exists) {
        state.messagesByFile[fileId].push(message);
      }
      // Track unread count only when chat is not currently open
      if (!isOpen) {
        state.unreadCountByFile[fileId] = (state.unreadCountByFile[fileId] ?? 0) + 1;
      }
    },

    setMessageHistory(
      state,
      action: PayloadAction<{ fileId: string; messages: ChatMessage[] }>
    ) {
      const { fileId, messages } = action.payload;
      state.messagesByFile[fileId] = messages;
    },

    setOnlineUsers(
      state,
      action: PayloadAction<{ fileId: string; users: OnlineUser[] }>
    ) {
      const { fileId, users } = action.payload;
      state.onlineUsersByFile[fileId] = users;
    },

    addTypingUser(
      state,
      action: PayloadAction<{ fileId: string; userName: string }>
    ) {
      const { fileId, userName } = action.payload;
      if (!state.typingByFile[fileId]) {
        state.typingByFile[fileId] = [];
      }
      if (!state.typingByFile[fileId].includes(userName)) {
        state.typingByFile[fileId].push(userName);
      }
    },

    removeTypingUser(
      state,
      action: PayloadAction<{ fileId: string; userName: string }>
    ) {
      const { fileId, userName } = action.payload;
      if (state.typingByFile[fileId]) {
        state.typingByFile[fileId] = state.typingByFile[fileId].filter(
          (u) => u !== userName
        );
      }
    },

    clearRoom(state, action: PayloadAction<string>) {
      const fileId = action.payload;
      delete state.messagesByFile[fileId];
      delete state.onlineUsersByFile[fileId];
      delete state.typingByFile[fileId];
      delete state.unreadCountByFile[fileId];
    },

    clearUnread(state, action: PayloadAction<string>) {
      const fileId = action.payload;
      state.unreadCountByFile[fileId] = 0;
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },

    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const {
  addMessage,
  setMessageHistory,
  setOnlineUsers,
  addTypingUser,
  removeTypingUser,
  clearRoom,
  clearUnread,
  setError,
  setLoading,
} = chatSlice.actions;

export default chatSlice.reducer;
