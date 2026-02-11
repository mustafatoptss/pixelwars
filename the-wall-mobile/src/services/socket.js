// frontend/src/services/socket.js
import { io } from "socket.io-client";

// Kendi Mac IP'ni buraya yazmayı unutma!
const SOCKET_URL = "http://192.168.1.106:3000"; 

const socket = io("http://192.168.1.106:3000", {
  transports: ["websocket"], // Bazen "polling" gerekebilir ama r/place için websocket iyidir
  reconnection: true,
  reconnectionAttempts: 5
});

export default socket;