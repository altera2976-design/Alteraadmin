import { io, Socket } from "socket.io-client";
import { API_URL } from "../constants/config";

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    const socketUrl = API_URL.replace(/\/api\/?$/, ""); // Strip /api from end
    console.log("🔗 Attempting Socket.IO connection to:", socketUrl);
    socket = io(socketUrl, {
      autoConnect: true,
      transports: ["polling", "websocket"], // Ensure fallback from polling to WS
      forceNew: true,
    });

    socket.on("connect", () => {
      console.log("✅ Socket.IO connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.warn("⚠️ Socket.IO disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket.IO connection error:", err.message);
    });
  }
  return socket;
};
