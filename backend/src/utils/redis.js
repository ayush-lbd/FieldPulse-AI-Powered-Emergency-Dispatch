import { createClient } from 'redis';

const redisHost = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
    url: redisHost
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err));
redisClient.on('connect', () => console.log('⚡ Connected to Redis instance successfully!'));

export async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
}