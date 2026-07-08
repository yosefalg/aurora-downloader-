import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/monitoring/logger';
import { subscribeCancel } from '@/lib/queue/cancellation';

export interface DownloadProgress {
  percent: number;
  speed?: number;
  eta?: number;
  totalSize?: number;
  downloadedSize?: number;
}

export interface DownloadOptions {
  quality: string;
  format: string;
  subtitle?: string;
  maxRetries?: number;
  timeout?: number;
  priority?: number;
  bandwidthLimit?: number;
}

export interface DownloadResult {
  filePath: string;
  filename: string;
  size: number;
  duration: number;
  speed: number;
}

export class DownloadEngine extends EventEmitter {
  private downloadDir: string;
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private tempFiles: Map<string, string> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    super();
    this.downloadDir = process.env.DOWNLOAD_PATH || './downloads';
    this.ensureDownloadDir();
    this.setupCleanup();

    subscribeCancel((jobId) => {
      this.cancel(jobId).catch((err) => {
        logger.error('Failed to cancel via Redis', { jobId, error: err });
      });
    });
  }

  private async ensureDownloadDir(): Promise<void> {
    try {
      await fs.mkdir(this.downloadDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create download directory', { error });
      throw error;
    }
  }

  private setupCleanup(): void {
    const interval = parseInt(process.env.CLEANUP_INTERVAL || '86400000');
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleDownloads().catch((error) => {
        logger.error('Cleanup error', { error });
      });
    }, interval);
  }

  private async runYtDlpJson(url: string, args: string[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const proc = spawn('yt-dlp', ['-J', ...args, url]);
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      proc.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(stdout));
          } catch (error) {
            reject(new Error(`JSON parse failed: ${error}`));
          }
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
        }
      });
      proc.on('error', reject);
    });
  }

  private parseProgress(line: string): DownloadProgress | null {
    const percentMatch = line.match(/\[download\]\s+(\d+\.?\d*)%/i);
    if (!percentMatch) return null;
    const percent = parseFloat(percentMatch[1]);

    const speedMatch = line.match(/at\s+([\d.]+)\s*([KMG])?i?B\/s/i);
    let speed: number | undefined;
    if (speedMatch) {
      const val = parseFloat(speedMatch[1]);
      const unit = speedMatch[2] || '';
      const multipliers: Record<string, number> = { '': 1, 'K': 1024, 'M': 1024 * 1024, 'G': 1024 * 1024 * 1024 };
      speed = val * (multipliers[unit] || 1);
    }

    const etaMatch = line.match(/ETA\s+(\d+):(\d+)(?::(\d+))?/i);
    let eta: number | undefined;
    if (etaMatch) {
      const hours = parseInt(etaMatch[1] || '0');
      const minutes = parseInt(etaMatch[2] || '0');
      const seconds = parseInt(etaMatch[3] || '0');
      eta = hours * 3600 + minutes * 60 + seconds;
    }

    const sizeMatch = line.match(/of\s+~?\s*([\d.]+)\s*([KMG])?i?B/i);
    let totalSize: number | undefined;
    if (sizeMatch) {
      const val = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2] || '';
      const multipliers: Record<string, number> = { '': 1, 'K': 1024, 'M': 1024 * 1024, 'G': 1024 * 1024 * 1024 };
      totalSize = val * (multipliers[unit] || 1);
    }

    return {
      percent,
      speed,
      eta,
      totalSize,
      downloadedSize: totalSize ? totalSize * (percent / 100) : undefined,
    };
  }

  async download(
    url: string,
    pluginId: string,
    options: DownloadOptions,
    jobId: string
  ): Promise<DownloadResult> {
    const info = await this.runYtDlpJson(url);
    const maxSize = parseInt(process.env.MAX_DOWNLOAD_SIZE || '10737418240');
    if (info.filesize && info.filesize > maxSize) {
      throw new Error(`File size (${info.filesize} bytes) exceeds maximum allowed (${maxSize} bytes)`);
    }

    const filename = `${randomUUID()}.${options.format}`;
    const tempPath = path.join(this.downloadDir, `temp_${filename}`);
    const finalPath = path.join(this.downloadDir, filename);
    this.tempFiles.set(jobId, tempPath);

    const args = [
      '--format', options.quality,
      '--output', tempPath,
      '--no-overwrites',
      '--progress',
      '--newline',
      '--no-warnings',
      '--no-check-certificate',
      '--socket-timeout', '30',
      '--retries', String(options.maxRetries || 3),
      '--fragment-retries', '10',
      '--skip-unavailable-fragments',
      '--abort-on-unavailable-fragment',
    ];

    if (options.subtitle) {
      args.push('--write-subs', '--sub-lang', options.subtitle);
    }
    if (options.bandwidthLimit) {
      args.push('--limit-rate', `${options.bandwidthLimit}`);
    }
    args.push('--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    args.push(url);

    logger.info(`Starting download: ${url}`, { jobId, quality: options.quality });

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let speed = 0;
      let stderr = '';

      const proc = spawn('yt-dlp', args);
      this.activeProcesses.set(jobId, proc);

      proc.stdout.on('data', (data) => {
        const line = data.toString();
        const progress = this.parseProgress(line);
        if (progress) {
          speed = progress.speed || speed;
          this.emit('progress', { jobId, progress });
        }
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', async (code) => {
        this.activeProcesses.delete(jobId);
        this.tempFiles.delete(jobId);
        if (code === 0) {
          try {
            const result = await this.finalizeDownload(tempPath, finalPath, startTime, speed);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        } else {
          await this.cleanupTempFile(tempPath);
          reject(new Error(`yt-dlp error: ${stderr || 'Unknown error'}`));
        }
      });

      proc.on('error', (error) => {
        this.activeProcesses.delete(jobId);
        this.tempFiles.delete(jobId);
        reject(error);
      });

      const timeout = parseInt(process.env.DOWNLOAD_TIMEOUT || '1800000');
      const timeoutId = setTimeout(() => {
        this.cancel(jobId);
        reject(new Error('Download timeout'));
      }, timeout);
      proc.on('close', () => clearTimeout(timeoutId));
    });
  }

  private async finalizeDownload(
    tempPath: string,
    finalPath: string,
    startTime: number,
    speed: number
  ): Promise<DownloadResult> {
    let sourcePath = tempPath;
    if (!await this.fileExists(tempPath)) {
      const dir = path.dirname(tempPath);
      const files = await fs.readdir(dir);
      const tempFiles = files.filter(f => f.startsWith('temp_') && f.endsWith(path.extname(tempPath)));
      if (tempFiles.length > 0) {
        sourcePath = path.join(dir, tempFiles[tempFiles.length - 1]!);
      } else {
        const recent = await this.findRecentFile(dir);
        if (recent) {
          sourcePath = recent;
        } else {
          throw new Error('Downloaded file not found');
        }
      }
    }
    if (sourcePath !== finalPath) {
      await fs.rename(sourcePath, finalPath);
    }
    const stats = await fs.stat(finalPath);
    const duration = (Date.now() - startTime) / 1000;
    return {
      filePath: finalPath,
      filename: path.basename(finalPath),
      size: stats.size,
      duration,
      speed: speed || (stats.size / duration),
    };
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async findRecentFile(dir: string): Promise<string | null> {
    try {
      const files = await fs.readdir(dir);
      let latest: string | null = null;
      let latestTime = 0;
      for (const file of files) {
        if (file.startsWith('.')) continue;
        const fullPath = path.join(dir, file);
        const stats = await fs.stat(fullPath);
        if (stats.mtimeMs > latestTime) {
          latestTime = stats.mtimeMs;
          latest = fullPath;
        }
      }
      if (latest && Date.now() - latestTime < 60000) {
        return latest;
      }
      return null;
    } catch {
      return null;
    }
  }

  async cancel(jobId: string): Promise<boolean> {
    const proc = this.activeProcesses.get(jobId);
    if (proc) {
      proc.kill('SIGINT');
      this.activeProcesses.delete(jobId);
      const tempPath = this.tempFiles.get(jobId);
      if (tempPath) {
        await this.cleanupTempFile(tempPath);
        this.tempFiles.delete(jobId);
      }
      return true;
    }
    return false;
  }

  private async cleanupTempFile(tempPath: string): Promise<void> {
    try {
      await fs.unlink(tempPath).catch(() => {});
    } catch (e) {}
  }

  private async cleanupStaleDownloads(): Promise<void> {
    const maxAge = parseInt(process.env.FILE_MAX_AGE || '604800000');
    const cutoff = Date.now() - maxAge;
    try {
      const files = await fs.readdir(this.downloadDir);
      for (const file of files) {
        const fullPath = path.join(this.downloadDir, file);
        const stats = await fs.stat(fullPath);
        if (stats.isFile() && stats.mtimeMs < cutoff) {
          await fs.unlink(fullPath);
          logger.info('Cleaned up stale file', { file });
        }
      }
    } catch (error) {
      logger.error('Cleanup error', { error });
    }
  }

  async destroy(): Promise<void> {
    clearInterval(this.cleanupInterval);
    for (const [jobId, proc] of this.activeProcesses) {
      proc.kill('SIGKILL');
    }
    this.activeProcesses.clear();
    this.tempFiles.clear();
  }
}

export const downloadEngine = new DownloadEngine();
