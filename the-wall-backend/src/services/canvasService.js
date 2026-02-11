import Redis from 'ioredis';
import { CANVAS_KEY, CANVAS_WIDTH, CANVAS_HEIGHT, COOLDOWN_TIME } from '../constants/canvas.js';

const redis = new Redis();

export const canvasService = {
    async init() {
        const exists = await redis.exists(CANVAS_KEY); // REDİS KAYIT KONTROLÜ
        if (!exists) {
            const emptyCanvas = Buffer.alloc(CANVAS_WIDTH * CANVAS_HEIGHT, 0); // YER AYIRDIK HER PİXEL İCİN
            await redis.set(CANVAS_KEY, emptyCanvas); //CANVASI EMPTCANYVASA KAYDETTIK
            console.log("🎨 Canvas initialized in Redis.");
            
        }
    },

    async getCanvas() {
        return await redis.getBuffer(CANVAS_KEY);
    },

    async updatePixel(x, y, colorIndex) {
        const offset = y * CANVAS_WIDTH + x;
        // setrange: Redis'teki string/buffer'ın belli bir pozisyonunu günceller
        await redis.setrange(CANVAS_KEY, offset, Buffer.from([colorIndex]));
    },

    async setCooldown(userId) {
        await redis.set(`cooldown:${userId}`, '1', 'EX', COOLDOWN_TIME);
    },

    async isOnCooldown(userId) {
        return await redis.get(`cooldown:${userId}`);
    }
};