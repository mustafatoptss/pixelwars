import { canvasService } from '../services/canvasService.js';

// backend/src/sockets/pixelHandler.js

export default function registerPixelHandlers(io, socket) {
    socket.on('paint_pixel', async (payload) => { 
        // 🚨 BU LOGU GÖRMEMİZ LAZIM:
        console.log("🎨 GELEN VERİ:", payload); 

        const { x, y, colorIndex, nickname } = payload;

        // Redis güncelleme ve cooldown işlemleri...
        await canvasService.updatePixel(x, y, colorIndex);
        
        // Herkese yayınla
        io.emit('pixel_changed', { x, y, colorIndex, nickname });
    });
}