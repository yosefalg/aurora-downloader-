import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

let ratelimit: Ratelimit | null = null;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (redisUrl && redisToken) {
  const redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      parseInt(process.env.RATE_LIMIT_REQUESTS || '30'),
      `${parseInt(process.env.RATE_LIMIT_WINDOW || '60000')} ms`
    ),
    analytics: true,
  });
} else {
  const memoryStore = new Map<string, { count: number; reset: number }>();
  const cleanupInterval = 60000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of memoryStore) {
      if (now > value.reset) {
        memoryStore.delete(key);
      }
    }
  }, cleanupInterval);
  ratelimit = new Ratelimit({
    redis: {
      incr: async (key: string) => {
        const now = Date.now();
        const entry = memoryStore.get(key);
        if (!entry || now > entry.reset) {
          const reset = now + parseInt(process.env.RATE_LIMIT_WINDOW || '60000');
          memoryStore.set(key, { count: 1, reset });
          return { success: true, limit: 30, remaining: 29, reset };
        }
        entry.count += 1;
        memoryStore.set(key, entry);
        const limit = parseInt(process.env.RATE_LIMIT_REQUESTS || '30');
        return {
          success: entry.count <= limit,
          limit,
          remaining: Math.max(0, limit - entry.count),
          reset: entry.reset,
        };
      },
    } as any,
    limiter: Ratelimit.slidingWindow(
      parseInt(process.env.RATE_LIMIT_REQUESTS || '30'),
      `${parseInt(process.env.RATE_LIMIT_WINDOW || '60000')} ms`
    ),
  });
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function rateLimit(request: NextRequest): Promise<RateLimitResult> {
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const key = `ratelimit:${ip}`;
  const whitelist = (process.env.RATE_LIMIT_WHITELIST || '').split(',').filter(Boolean);
  if (whitelist.includes(ip)) {
    return { success: true, limit: 999, remaining: 999, reset: Date.now() + 60000 };
  }
  if (ratelimit) {
    const result = await ratelimit.limit(key);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }
  return { success: true, limit: 999, remaining: 999, reset: Date.now() + 60000 };
}
