import React, { type ReactNode } from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import authReducer from "../../src/store/authSlice";
import chatReducer from "../../src/store/chatSlice";
import { useChat } from "../../src/hooks/useChat";
import type { ChatMessage } from "../../src/types/chat";

type Handler = (...args: unknown[]) => void;

const socketMocks = vi.hoisted(() => {
  const handlers = new Map<string, Handler>();
  const reconnectHandlers = new Map<string, Handler>();

  const socket = {
    connected: false,
    emit: vi.fn(),
    on: vi.fn((event: string, handler: Handler) => {
      handlers.set(event, handler);
      return socket;
    }),
    off: vi.fn((event: string) => {
      handlers.delete(event);
      return socket;
    }),
    connect: vi.fn(() => {
      socket.connected = true;
      handlers.get("connect")?.();
      return socket;
    }),
    io: {
      on: vi.fn((event: string, handler: Handler) => {
        reconnectHandlers.set(event, handler);
      }),
      off: vi.fn((event: string) => {
        reconnectHandlers.delete(event);
      }),
    },
  };

  return {
    handlers,
    reconnectHandlers,
    socket,
    connectSocket: vi.fn(() => socket),
    reset() {
      handlers.clear();
      reconnectHandlers.clear();
      socket.connected = false;
      socket.emit.mockClear();
      socket.on.mockClear();
      socket.off.mockClear();
      socket.connect.mockClear();
      socket.io.on.mockClear();
      socket.io.off.mockClear();
      this.connectSocket.mockClear();
    },
  };
});

vi.mock("@/socket/socketClient", () => ({
  connectSocket: socketMocks.connectSocket,
}));

function renderUseChat(fileId = "file-1") {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      chat: chatReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: "user-1",
          name: "Alice",
          email: "alice@example.com",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        token: "access-token",
        refreshToken: "refresh-token",
        loading: false,
        error: null,
        requires2fa: false,
        tempToken: null,
        twoFactorEnabled: false,
        qrCode: null,
        resetEmailSent: false,
        resetSuccess: false,
      },
      chat: {
        messagesByFile: {},
        onlineUsersByFile: {},
        typingByFile: {},
        unreadCountByFile: {},
        loading: false,
        error: null,
      },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return {
    store,
    ...renderHook(() => useChat(fileId), { wrapper }),
  };
}

beforeEach(() => {
  socketMocks.reset();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  );
});

describe("useChat", () => {
  it("emits join_room on mount with the current file and user", async () => {
    renderUseChat();

    await waitFor(() => {
      expect(socketMocks.socket.emit).toHaveBeenCalledWith("join_room", {
        fileId: "file-1",
        userId: "user-1",
        userName: "Alice",
      });
    });
  });

  it("adds received socket messages to the hook state", async () => {
    const { result } = renderUseChat();
    const message: ChatMessage = {
      id: "message-1",
      fileId: "file-1",
      userId: "user-2",
      userName: "Bob",
      userEmail: "bob@example.com",
      content: "hello",
      timestamp: "2026-01-01T00:00:00.000Z",
    };

    await waitFor(() => {
      expect(socketMocks.handlers.get("message_received")).toEqual(expect.any(Function));
    });

    act(() => {
      socketMocks.handlers.get("message_received")?.(message);
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual([message]);
    });
  });

  it("emits leave_room on unmount", async () => {
    const { unmount } = renderUseChat();

    await waitFor(() => {
      expect(socketMocks.socket.emit).toHaveBeenCalledWith("join_room", expect.any(Object));
    });

    unmount();

    expect(socketMocks.socket.emit).toHaveBeenCalledWith("leave_room", {
      fileId: "file-1",
      userId: "user-1",
    });
  });

  it("does not emit send_message for empty content", () => {
    const { result } = renderUseChat();
    socketMocks.socket.emit.mockClear();

    act(() => {
      result.current.sendMessage("   ");
    });

    expect(socketMocks.socket.emit).not.toHaveBeenCalled();
  });

  it("emits send_message with trimmed content for non-empty messages", () => {
    const { result } = renderUseChat();
    socketMocks.socket.emit.mockClear();

    act(() => {
      result.current.sendMessage("  hello team  ");
    });

    expect(socketMocks.socket.emit).toHaveBeenCalledWith("send_message", {
      fileId: "file-1",
      userId: "user-1",
      userName: "Alice",
      userEmail: "alice@example.com",
      content: "hello team",
    });
  });
});
