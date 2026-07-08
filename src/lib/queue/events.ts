import { queueEvents } from './index';
import { logger } from '@/lib/monitoring/logger';

queueEvents.on('progress', ({ jobId, data }) => {
  logger.debug('Job progress', { jobId, progress: data });
});

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.info('Job completed', { jobId, result: returnvalue });
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('Job failed', { jobId, error: failedReason });
});

queueEvents.on('stalled', ({ jobId }) => {
  logger.warn('Job stalled', { jobId });
});

queueEvents.on('removed', ({ jobId }) => {
  logger.info('Job removed', { jobId });
});

queueEvents.on('drained', () => {
  logger.debug('Queue drained');
});
