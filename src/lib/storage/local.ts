import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import { logger } from '@/lib/monitoring/logger';

const BASE_PATH = process.env.DOWNLOAD_PATH || './downloads';

export async function saveLocalFile(
  filename: string,
  sourcePath: string
): Promise<string> {
  const destPath = path.join(BASE_PATH, filename);
  await fs.copyFile(sourcePath, destPath);
  logger.info('File saved locally', { path: destPath });
  return destPath;
}

export function createLocalReadStream(filePath: string) {
  return createReadStream(filePath, {
    highWaterMark: parseInt(process.env.DOWNLOAD_BUFFER_SIZE || '65536'),
  });
}

export async function deleteLocalFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    logger.info('Local file deleted', { path: filePath });
  } catch (error) {
    logger.error('Failed to delete local file', { error, path: filePath });
  }
}

export async function getLocalFileStats(filePath: string) {
  return fs.stat(filePath);
}
