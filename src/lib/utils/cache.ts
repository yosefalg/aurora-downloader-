import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

export const cache = {
  async get(key: string): Promise<string | null> {
    try {
      return await redis.get(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: string, ttl: number = 3600): Promise<void> {
    try {
      await redis.setex(key, ttl, value);
    } catch {}
  },

  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch {}
  },

  async flush(): Promise<void> {
    try {
      await redis.flushdb();
    } catch {}
  },
};
