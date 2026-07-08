import Redis from 'ioredis';
import { randomUUID } from 'crypto';

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

export class RedisLock {
  private lockKey: string;
  private lockValue: string;
  private ttl: number;

  constructor(key: string, ttl: number = 30000) {
    this.lockKey = `lock:${key}`;
    this.lockValue = randomUUID();
    this.ttl = ttl;
  }

  async acquire(): Promise<boolean> {
    const result = await redis.set(this.lockKey, this.lockValue, 'NX', 'PX', this.ttl);
    return result === 'OK';
  }

  async release(): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await redis.eval(script, 1, this.lockKey, this.lockValue);
  }

  async withLock<T>(fn: () => Promise<T>): Promise<T | null> {
    if (!await this.acquire()) {
      return null;
    }
    try {
      return await fn();
    } finally {
      await this.release();
    }
  }
}
