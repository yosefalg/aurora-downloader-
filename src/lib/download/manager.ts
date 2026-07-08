import { EventEmitter } from 'events';
import { downloadEngine, DownloadOptions, DownloadProgress } from './engine';
import { downloadRepo } from '@/lib/db/repositories/download';
import { auditRepo } from '@/lib/db/repositories/audit';
import { logger } from '@/lib/monitoring/logger';
import { downloadsTotal, downloadsActive } from '@/lib/monitoring/metrics';
import { withTransaction } from '@/lib/db/prisma';
import { Status } from '@prisma/client';
import { downloadQueue } from '@/lib/queue';
import { Job } from 'bullmq';
import { RedisLock } from '@/lib/security/redisLock';
import { publishCancel } from '@/lib/queue/cancellation';

export interface DownloadJobData {
  id: string;
  url: string;
  quality: string;
  format: string;
  subtitle?: string;
  userId?: string;
  sessionId?: string;
  priority?: number;
}

export class DownloadManager extends EventEmitter {
  private activeDownloads: Map<string, { job: Job; startTime: number }> = new Map();
  private progressUpdateInterval: NodeJS.Timeout;
  private pendingProgress: Map<string, number> = new Map();
  private recoveryLock = new RedisLock('download-recovery', 60000);

  constructor() {
    super();
    this.progressUpdateInterval = setInterval(() => {
      this.flushProgressUpdates();
    }, 1000);
    this.recoverJobs().catch((err) => {
      logger.error('Initial recovery failed', { error: err });
    });
    setInterval(() => {
      this.recoverJobs().catch((err) => {
        logger.error('Periodic recovery failed', { error: err });
      });
    }, 60000);
  }

  private async flushProgressUpdates(): Promise<void> {
    if (this.pendingProgress.size === 0) return;
    const entries = Array.from(this.pendingProgress.entries());
    this.pendingProgress.clear();
    for (const [id, progress] of entries) {
      try {
        await downloadRepo.updateProgress(id, progress);
      } catch (err) {
        logger.error('Failed to flush progress', { id, progress, error: err });
        this.pendingProgress.set(id, progress);
      }
    }
  }

  private enqueueProgress(jobId: string, progress: number): void {
    this.pendingProgress.set(jobId, progress);
  }

  async submit(data: DownloadJobData): Promise<string> {
    if (!data.url || !data.quality || !data.format) {
      throw new Error('Missing required fields: url, quality, format');
    }
    let record;
    try {
      record = await withTransaction(async (tx) => {
        const created = await downloadRepo.create({
          url: data.url,
          quality: data.quality,
          format: data.format,
          userId: data.userId,
          sessionId: data.sessionId,
          priority: data.priority || 0,
        }, tx);
        await downloadRepo.addHistory(created.id, 'PENDING', 0, undefined, tx);
        await auditRepo.log(created.id, 'SUBMITTED', {
          url: data.url,
          quality: data.quality,
          format: data.format,
          userId: data.userId,
          sessionId: data.sessionId,
        }, undefined, undefined, tx);
        return created;
      });
    } catch (error: any) {
      if (error.message && error.message.includes('already exists')) {
        throw new Error('A download with the same URL and quality is already in progress.');
      }
      throw error;
    }
    const job = await downloadQueue.add(
      'download',
      {
        id: record.id,
        url: data.url,
        quality: data.quality,
        format: data.format,
        subtitle: data.subtitle,
        userId: data.userId,
        sessionId: data.sessionId,
        priority: data.priority || 0,
      },
      {
        jobId: record.id,
        priority: data.priority || 0,
        attempts: parseInt(process.env.DOWNLOAD_MAX_RETRIES || '3'),
        backoff: { type: 'exponential', delay: 5000 },
        timeout: parseInt(process.env.DOWNLOAD_TIMEOUT || '1800000'),
      }
    );
    await downloadRepo.updateStatus(record.id, 'PENDING', { jobId: job.id });
    logger.info(`Download job submitted: ${record.id}`, { url: data.url, quality: data.quality });
    return record.id;
  }

  async cancel(jobId: string): Promise<boolean> {
    await publishCancel(jobId);

    const job = await downloadQueue.getJob(jobId);
    if (job) {
      if (await job.isActive()) await job.cancel();
      await job.remove();
    }

    const updated = await downloadRepo.updateStatus(jobId, 'CANCELLED');
    if (updated) {
      await downloadRepo.addHistory(jobId, 'CANCELLED', 0);
      await auditRepo.log(jobId, 'CANCELLED');
      this.activeDownloads.delete(jobId);
      this.emit('cancelled', { jobId });
      logger.info(`Download cancelled: ${jobId}`);
      return true;
    }
    return false;
  }

  private handleProgress = ({ jobId, progress }: { jobId: string; progress: DownloadProgress }) => {
    const percent = Math.round(progress.percent || 0);
    this.enqueueProgress(jobId, percent);
    this.emit('progress', { jobId, progress });
  };

  async startDownload(job: Job<DownloadJobData>): Promise<void> {
    const { id, url, quality, format, subtitle } = job.data;
    await downloadRepo.updateStatus(id, 'PROCESSING');
    this.activeDownloads.set(id, { job, startTime: Date.now() });
    downloadsActive.inc();
    downloadEngine.on('progress', this.handleProgress);
    try {
      const options: DownloadOptions = {
        quality,
        format,
        subtitle,
        maxRetries: job.attemptsMade || 0,
        timeout: parseInt(process.env.DOWNLOAD_TIMEOUT || '1800000'),
        priority: job.data.priority || 0,
      };
      const result = await downloadEngine.download(url, 'unknown', options, id);
      await withTransaction(async (tx) => {
        await downloadRepo.updateStatus(id, 'COMPLETED', {
          filePath: result.filePath,
          filename: result.filename,
          fileSize: result.size,
          progress: 100,
        }, tx);
        await downloadRepo.addHistory(id, 'COMPLETED', 100, undefined, tx);
        await auditRepo.log(id, 'DOWNLOAD_COMPLETED', {
          duration: result.duration,
          size: result.size,
          speed: result.speed,
        }, undefined, undefined, tx);
      });
      downloadsTotal.inc({ status: 'completed', quality });
      this.emit('completed', { id, result });
      logger.info('Download completed', { id, file: result.filename, size: result.size });
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      await withTransaction(async (tx) => {
        await downloadRepo.updateStatus(id, 'FAILED', { error: errorMessage }, tx);
        await downloadRepo.addHistory(id, 'FAILED', 0, errorMessage, tx);
        await auditRepo.log(id, 'DOWNLOAD_FAILED', { error: errorMessage }, undefined, undefined, tx);
      });
      downloadsTotal.inc({ status: 'failed', quality });
      this.emit('failed', { id, error: errorMessage });
      logger.error('Download failed', { id, error: errorMessage });
      throw error;
    } finally {
      this.activeDownloads.delete(id);
      downloadsActive.dec();
      downloadEngine.off('progress', this.handleProgress);
    }
  }

  private async recoverJobs(): Promise<void> {
    await this.recoveryLock.withLock(async () => {
      try {
        const stale = await downloadRepo.findStale(30);
        for (const record of stale) {
          if (record.jobId) {
            logger.warn('Recovering stale job', { jobId: record.id, url: record.url });
            await downloadEngine.cancel(record.id);
            if (record.retryCount < (record.maxRetries || 3)) {
              const oldJob = await downloadQueue.getJob(record.jobId);
              if (oldJob) await oldJob.remove();
              await downloadQueue.add(
                'download',
                {
                  id: record.id,
                  url: record.url,
                  quality: record.quality,
                  format: record.format,
                  subtitle: record.subtitle || undefined,
                  userId: record.userId || undefined,
                  sessionId: record.sessionId || undefined,
                  priority: record.priority || 0,
                },
                {
                  jobId: record.id,
                  priority: record.priority || 0,
                  attempts: (record.maxRetries || 3) - record.retryCount,
                  backoff: { type: 'exponential', delay: 5000 },
                  timeout: parseInt(process.env.DOWNLOAD_TIMEOUT || '1800000'),
                }
              );
              await downloadRepo.updateStatus(record.id, 'PENDING', { jobId: record.id });
              logger.info('Re-queued stale job', { jobId: record.id });
            } else {
              await downloadRepo.updateStatus(record.id, 'FAILED', { error: 'Max retries exceeded' });
              await downloadRepo.addHistory(record.id, 'FAILED', 0, 'Max retries exceeded');
              logger.warn('Job failed due to max retries', { jobId: record.id });
            }
          }
        }
        const pending = await downloadRepo.findActive();
        const queueJobs = await downloadQueue.getJobs(['waiting', 'active', 'delayed']);
        const queueJobIds = new Set(queueJobs.map(j => j.id));
        for (const record of pending) {
          if (record.jobId && !queueJobIds.has(record.jobId)) {
            await downloadQueue.add(
              'download',
              {
                id: record.id,
                url: record.url,
                quality: record.quality,
                format: record.format,
                subtitle: record.subtitle || undefined,
                userId: record.userId || undefined,
                sessionId: record.sessionId || undefined,
                priority: record.priority || 0,
              },
              {
                jobId: record.id,
                priority: record.priority || 0,
                attempts: (record.maxRetries || 3) - record.retryCount,
                backoff: { type: 'exponential', delay: 5000 },
                timeout: parseInt(process.env.DOWNLOAD_TIMEOUT || '1800000'),
              }
            );
            await downloadRepo.updateStatus(record.id, 'PENDING', { jobId: record.id });
            logger.info('Re-queued orphan job', { jobId: record.id });
          }
        }
      } catch (error) {
        logger.error('Recovery failed', { error });
      }
    });
  }

  async getStatus(jobId: string): Promise<any> {
    const record = await downloadRepo.findById(jobId);
    if (!record) return null;
    return {
      id: record.id,
      status: record.status,
      progress: record.progress,
      filename: record.filename,
      fileSize: record.fileSize ? Number(record.fileSize) : null,
      error: record.error,
      createdAt: record.createdAt,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
    };
  }

  getActiveCount(): number {
    return this.activeDownloads.size;
  }

  async destroy(): Promise<void> {
    clearInterval(this.progressUpdateInterval);
    await this.flushProgressUpdates();
    downloadEngine.off('progress', this.handleProgress);
    for (const [jobId] of this.activeDownloads) {
      await this.cancel(jobId);
    }
    await downloadEngine.destroy();
  }
}

export const downloadManager = new DownloadManager();
