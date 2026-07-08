import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '@/lib/monitoring/logger';

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const poolSize = parseInt(process.env.REDIS_POOL_SIZE || '20');

// Create shared Redis connection with pooling
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn('Redis retry', { attempt: times, delay });
    return delay;
  },
  reconnectOnError: (err) => {
    const targetErrors = ['READONLY', 'ECONNREFUSED', 'ETIMEDOUT'];
    const shouldReconnect = targetErrors.some(e => err.message.includes(e));
    if (shouldReconnect) {
      logger.error('Redis error, reconnecting', { error: err.message });
    }
    return shouldReconnect;
  },
  lazyConnect: true,
  keepAlive: 30000,
  enableOfflineQueue: false,
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('ready', () => {
  logger.info('Redis ready');
});

redis.on('error', (error) => {
  logger.error('Redis connection error', { error: error.message });
});

redis.on('reconnecting', () => {
  logger.warn('Redis reconnecting');
});

// Connection pool monitoring
export async function getRedisStats() {
  const info = await redis.info('clients');
  const connectedClients = info.match(/connected_clients:(\d+)/)?.[1];
  return { connectedClients: parseInt(connectedClients || '0') };
}

export const downloadQueue = new Queue('download', {
  connection: redis,
  defaultJobOptions: {
    attempts: parseInt(process.env.DOWNLOAD_MAX_RETRIES || '3'),
    backoff: { type: 'exponential', delay: 5000 },
    timeout: parseInt(process.env.DOWNLOAD_TIMEOUT || '1800000'),
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

export const queueEvents = new QueueEvents('download', { connection: redis });

queueEvents.on('error', (error) => {
  logger.error('Queue events error', { error });
});

export { redis };
