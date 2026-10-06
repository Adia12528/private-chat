import { io } from "socket.io-client";

function getSocketUrl() {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (typeof window !== "undefined" && window.location.hostname) {
    const host = window.location.hostname;
    const isLocalhost = host === "localhost" || host === "127.0.0.1";
    // If accessed from mobile/LAN and env is localhost or default
    if (!isLocalhost && (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
      return `${window.location.protocol}//${host}:3001`;
    }
  }
  return envUrl || "http://localhost:3001";
}

const SOCKET_URL = getSocketUrl();

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
