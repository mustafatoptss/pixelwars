// frontend/src/services/socket.js
import { io } from "socket.io-client";

// Railway'e deploy edilmiş backend URL'i
const SOCKET_URL = "https://pixel-war-backend-production.up.railway.app";
const socket = io("https://pixel-war-backend-production.up.railway.app", {
  transports: ["websocket"], // Bazen "polling" gerekebilir ama r/place için websocket iyidir
  reconnection: true,
  reconnectionAttempts: 5
});

export default socket;