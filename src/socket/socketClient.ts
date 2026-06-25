// src/socket/socketClient.ts
import { io, Socket } from "socket.io-client";

// Strip /api suffix — Socket.IO connects to the root server, not /api
const _rawUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:5003/api") as string;
const SOCKET_URL = _rawUrl.replace(/\/api$/, "");

let socket: Socket | null = null;

/**
 * Get or create the Socket.IO client instance with JWT authentication.
 * The token is passed in the auth object and will be verified on the server handshake.
 */
export function getSocket(token?: string): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      // Security: Pass JWT token for server-side authentication (#23)
      auth: (cb) => {
        // Get token from localStorage if not provided
        const authToken = token || localStorage.getItem("token");
        cb({ token: authToken });
      },
    });
  }
  return socket;
}

/**
 * Connect the socket with the current authentication token.
 * Should be called after successful login.
 */
export function connectSocket(token?: string): Socket {
  const s = getSocket(token);
  if (!s.connected) {
    s.connect();
  }
  return s;
}

/**
 * Disconnect and clean up the socket connection.
 * Should be called on logout.
 */
export function disconnectSocket(): void {
  if (socket && socket.connected) {
    socket.disconnect();
  }
  // Clear the socket instance so next connection will create a new one with fresh token
  socket = null;
}

export default getSocket;
