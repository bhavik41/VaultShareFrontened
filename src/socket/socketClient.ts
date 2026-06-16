// src/socket/socketClient.ts
import { io, Socket } from "socket.io-client";

// Strip /api suffix — Socket.IO connects to the root server, not /api
const _rawUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:5003/api") as string;
const SOCKET_URL = _rawUrl.replace(/\/api$/, "");

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}

export default getSocket;
