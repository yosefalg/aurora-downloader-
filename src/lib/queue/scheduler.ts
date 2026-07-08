import { QueueScheduler } from 'bullmq';
import { redis } from './index';
import { logger } from '@/lib/monitoring/logger';

const scheduler = new QueueScheduler('download', { connection: redis });

scheduler.on('error', (error) => {
  logger.error('Scheduler error', { error });
});

logger.info('Queue scheduler started');

process.on('SIGTERM', async () => {
  await scheduler.close();
  logger.info('Scheduler closed');
});
