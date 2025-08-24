import { createClient } from 'redis';

let client = null;

// Simple in-memory store used when no Redis connection is available
const memoryStore = {};
const memoryClient = {
  async get(key) {
    return memoryStore[key] ?? null;
  },
  async set(key, value, _opts) {
    memoryStore[key] = value;
  },
  async del(key) {
    delete memoryStore[key];
  },
  async quit() {
    // No-op for memory client
  }
};

export async function getRedisClient() {
  if (!client) {
    if (!process.env.REDIS_URL) {
      // No Redis configuration – fall back to in-memory store
      client = memoryClient;
      return client;
    }
    try {
      client = createClient({
        url: process.env.REDIS_URL
      });

      client.on('error', (err) => console.log('Redis Client Error', err));

      await client.connect();
    } catch (err) {
      console.warn('Failed to connect to Redis, using in-memory store:', err);
      client = memoryClient;
    }
  }
  return client;
}

export async function closeRedisClient() {
  if (client) {
    await client.quit();
    client = null;
  }
}