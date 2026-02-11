import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { canvasService } from "./services/canvasService.js";
import registerPixelHandlers from "./sockets/pixelHandler.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

await canvasService.init();

// Yardımcı fonksiyon: Herkese güncel sayıyı fırlatır
const broadcastUserCount = () => {
  const count = io.engine.clientsCount;
  io.emit('user_count', count);
  console.log(`👥 Aktif kullanıcı sayısı yayınlandı: ${count}`);
};


io.on("connection", async (socket) => {
  console.log(`✨ User connected: ${socket.id}`);
  

  // 1. BAĞLANIR BAĞLANMAZ: Herkese (ve yeni gelene) sayıyı bildir
  broadcastUserCount();

  // Frontend tuval verisini istediğinde (bu, frontend'in hazır olduğunu kanıtlar)
  socket.on("request_canvas", async () => {
    try {
      const currentCanvas = await canvasService.getCanvas();
      socket.emit("init_canvas", currentCanvas);
      
      // 2. GARANTİ OLSUN: Tuval verisiyle beraber kullanıcı sayısını tekrar gönder
      socket.emit('user_count', io.engine.clientsCount);
      
      console.log(`📤 Initial canvas sent to: ${socket.id}`);
    } catch (err) {
      console.error("❌ Veri gönderim hatası:", err);
    }
  });

  registerPixelHandlers(io, socket);

  socket.on("disconnect", () => {
    console.log(`👋 User disconnected: ${socket.id}`);
    // 3. AYRILMA ANINDA: Herkese yeni sayıyı bildir
    broadcastUserCount();
  });
});

const PORT = 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server ayağa kalktı!`);
  console.log(`🏠 Local: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://192.168.1.106:${PORT}`);
});