import Redis from 'ioredis';
import { logger } from '@/lib/monitoring/logger';

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
const CHANNEL = 'download:cancel';

export async function publishCancel(jobId: string): Promise<void> {
  await redis.publish(CHANNEL, jobId);
  logger.info(`Cancellation published for job ${jobId}`);
}

export function subscribeCancel(callback: (jobId: string) => void): void {
  const subscriber = redis.duplicate();

  subscriber.on('error', (err) => {
    logger.error('Redis Cancellation Subscriber Error', err);
  });

  subscriber.subscribe(CHANNEL);
  subscriber.on('message', (channel, message) => {
    if (channel === CHANNEL) {
      callback(message);
    }
  });

  process.on('SIGTERM', () => {
    subscriber.unsubscribe(CHANNEL);
    subscriber.quit();
  });
}
