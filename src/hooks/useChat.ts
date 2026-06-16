// src/hooks/useChat.ts
import { useEffect, useRef, useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addMessage,
  setMessageHistory,
  setOnlineUsers,
  addTypingUser,
  removeTypingUser,
  setError,
  clearUnread,
} from "@/store/chatSlice";
import { connectSocket } from "@/socket/socketClient";
import type { ChatMessage, OnlineUser } from "@/types/chat";

// VITE_API_URL already includes the /api suffix (e.g. http://localhost:5003/api)
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5003/api";

export function useChat(fileId: string) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const token = useAppSelector((s) => s.auth.token);
  const messages = useAppSelector((s) => s.chat.messagesByFile[fileId] ?? []);
  const onlineUsers = useAppSelector((s) => s.chat.onlineUsersByFile[fileId] ?? []);
  const typingUsers = useAppSelector((s) => s.chat.typingByFile[fileId] ?? []);
  const unreadCount = useAppSelector((s) => s.chat.unreadCountByFile[fileId] ?? 0);

  const [isConnected, setIsConnected] = useState(false);
  const [adminOnlyChat, setAdminOnlyChat] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const isChatOpen = useRef(true);

  // Fetch REST message history on mount
  useEffect(() => {
    if (!fileId || !token) return;
    fetch(`${API_BASE}/chat/${fileId}/messages?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.messages)) {
          dispatch(setMessageHistory({ fileId, messages: data.messages }));
        } else if (Array.isArray(data)) {
          dispatch(setMessageHistory({ fileId, messages: data }));
        }
      })
      .catch(() => {
        // silently ignore REST fetch errors — socket will provide history via message_history
      });
  }, [fileId, token, dispatch]);

  // Mark as open / clear unread
  useEffect(() => {
    dispatch(clearUnread(fileId));
    isChatOpen.current = true;
    return () => {
      isChatOpen.current = false;
    };
  }, [fileId, dispatch]);

  // Socket setup
  useEffect(() => {
    if (!fileId || !user) return;

    const socket = connectSocket();

    function handleConnect() {
      setIsConnected(true);
      // Join room on (re)connect
      socket.emit("join_room", {
        fileId,
        userId: user!.id,
        userName: user!.name,
      });
    }

    function handleDisconnect() {
      setIsConnected(false);
    }

    function handleReconnect() {
      // Re-join the room after socket.io Manager reconnects
      setIsConnected(true);
      socket.emit("join_room", {
        fileId,
        userId: user!.id,
        userName: user!.name,
      });
    }

    function handleConnectError() {
      setIsConnected(false);
    }

    function handleMessageReceived(msg: ChatMessage) {
      dispatch(
        addMessage({
          fileId,
          message: msg,
          isOpen: isChatOpen.current,
        })
      );
    }

    function handleMessageHistory(data: { messages: ChatMessage[] }) {
      dispatch(setMessageHistory({ fileId, messages: data.messages }));
    }

    function handleUserJoined(data: { userId: string; userName: string; onlineUsers: OnlineUser[] }) {
      dispatch(setOnlineUsers({ fileId, users: data.onlineUsers }));
    }

    function handleUserLeft(data: { userId: string; userName: string; onlineUsers: OnlineUser[] }) {
      dispatch(setOnlineUsers({ fileId, users: data.onlineUsers }));
    }

    function handleOnlineUsers(data: { users: OnlineUser[] }) {
      dispatch(setOnlineUsers({ fileId, users: data.users }));
    }

    function handleTypingIndicator(data: {
      userId: string;
      userName: string;
      isTyping: boolean;
    }) {
      if (data.userId === user!.id) return;
      if (data.isTyping) {
        dispatch(addTypingUser({ fileId, userName: data.userName }));
      } else {
        dispatch(removeTypingUser({ fileId, userName: data.userName }));
      }
    }

    function handleError(data: { message: string }) {
      dispatch(setError(data.message));
    }

    function handleAdminOnlyChanged(data: {
      fileId: string;
      adminOnly: boolean;
      ownerId: string | null;
    }) {
      if (data.fileId !== fileId) return;
      setAdminOnlyChat(!!data.adminOnly);
      setOwnerId(data.ownerId);
    }

    // Register listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.io.on("reconnect", handleReconnect);
    socket.on("message_received", handleMessageReceived);
    socket.on("message_history", handleMessageHistory);
    socket.on("user_joined", handleUserJoined);
    socket.on("user_left", handleUserLeft);
    socket.on("online_users", handleOnlineUsers);
    socket.on("typing_indicator", handleTypingIndicator);
    socket.on("admin_only_changed", handleAdminOnlyChanged);
    socket.on("error", handleError);

    // Connect and join — fire handleConnect immediately if already connected
    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      // Leave room and remove listeners
      socket.emit("leave_room", { fileId, userId: user!.id });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.io.off("reconnect", handleReconnect);
      socket.off("message_received", handleMessageReceived);
      socket.off("message_history", handleMessageHistory);
      socket.off("user_joined", handleUserJoined);
      socket.off("user_left", handleUserLeft);
      socket.off("online_users", handleOnlineUsers);
      socket.off("typing_indicator", handleTypingIndicator);
      socket.off("admin_only_changed", handleAdminOnlyChanged);
      socket.off("error", handleError);
    };
  }, [fileId, user, dispatch]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || !user) return;
      const socket = connectSocket();
      socket.emit("send_message", {
        fileId,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        content: content.trim(),
      });
    },
    [fileId, user]
  );

  const emitTyping = useCallback(() => {
    if (!user) return;
    const socket = connectSocket();
    socket.emit("typing", {
      fileId,
      userId: user.id,
      userName: user.name,
    });
  }, [fileId, user]);

  const emitStopTyping = useCallback(() => {
    if (!user) return;
    const socket = connectSocket();
    socket.emit("stop_typing", {
      fileId,
      userId: user.id,
    });
  }, [fileId, user]);

  const setAdminOnly = useCallback(
    (adminOnly: boolean) => {
      if (!user) return;
      const socket = connectSocket();
      socket.emit("set_admin_only", {
        fileId,
        userId: user.id,
        adminOnly,
      });
    },
    [fileId, user]
  );

  return {
    messages,
    onlineUsers,
    typingUsers,
    unreadCount,
    isConnected,
    sendMessage,
    emitTyping,
    emitStopTyping,
    adminOnlyChat,
    ownerId,
    setAdminOnly,
    currentUserId: user?.id ?? "",
  };
}
