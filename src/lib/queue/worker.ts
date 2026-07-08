import { Worker, Job } from 'bullmq';
import { downloadManager } from '@/lib/download/manager';
import { redis } from './index';
import { logger } from '@/lib/monitoring/logger';
import { queueJobs, queueErrors } from '@/lib/monitoring/metrics';

const maxConcurrent = parseInt(process.env.DOWNLOAD_MAX_PARALLEL || '4');

const worker = new Worker(
  'download',
  async (job: Job) => {
    await downloadManager.startDownload(job);
  },
  {
    connection: redis,
    concurrency: maxConcurrent,
    stalledInterval: 30000,
    maxStalledCount: 3,
  }
);

worker.on('completed', (job) => {
  queueJobs.inc({ status: 'completed' });
  logger.info(`Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  queueJobs.inc({ status: 'failed' });
  queueErrors.inc({ type: 'job_failed' });
  logger.error(`Job ${job?.id} failed`, { error: error.message });
});

worker.on('error', (error) => {
  queueErrors.inc({ type: 'worker_error' });
  logger.error('Worker error', { error });
});

process.on('SIGTERM', async () => {
  await worker.close();
  logger.info('Worker closed');
});

logger.info(`Worker started with concurrency ${maxConcurrent}`);
