import { downloadRepo } from '@/lib/db/repositories/download';
import { logger } from '@/lib/monitoring/logger';

export async function runCleanup(): Promise<void> {
  try {
    const deletedCount = await downloadRepo.deleteOldFiles(7);
    logger.info('Cleanup completed', { deletedCount });
  } catch (error) {
    logger.error('Cleanup failed', { error });
  }
}

export function scheduleCleanup(): NodeJS.Timeout {
  const interval = parseInt(process.env.CLEANUP_INTERVAL || '86400000');
  return setInterval(() => {
    runCleanup();
  }, interval);
}
