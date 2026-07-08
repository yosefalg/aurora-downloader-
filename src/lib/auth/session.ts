import Redis from 'ioredis';
import { generateSessionId } from './jwt';

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
const SESSION_PREFIX = 'session:';
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export async function createSession(userId: string, metadata?: any): Promise<string> {
  const sessionId = generateSessionId();
  await redis.setex(
    `${SESSION_PREFIX}${sessionId}`,
    SESSION_TTL,
    JSON.stringify({ userId, createdAt: Date.now(), metadata })
  );
  return sessionId;
}

export async function getSession(sessionId: string): Promise<any | null> {
  const data = await redis.get(`${SESSION_PREFIX}${sessionId}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function revokeSession(sessionId: string): Promise<void> {
  await redis.del(`${SESSION_PREFIX}${sessionId}`);
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const keys = await redis.keys(`${SESSION_PREFIX}*`);
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.userId === userId) {
        await redis.del(key);
      }
    }
  }
}
