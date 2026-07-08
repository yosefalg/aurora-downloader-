import { prisma } from '@/lib/db/prisma';
import { Status, Download, Prisma } from '@prisma/client';

export class DownloadRepository {
  async create(
    data: {
      url: string;
      quality: string;
      format: string;
      userId?: string;
      sessionId?: string;
      priority?: number;
      maxRetries?: number;
    },
    tx?: Prisma.TransactionClient
  ): Promise<Download> {
    const client = tx || prisma;
    try {
      return await client.download.create({
        data: {
          url: data.url,
          quality: data.quality,
          format: data.format,
          userId: data.userId,
          sessionId: data.sessionId,
          priority: data.priority || 0,
          maxRetries: data.maxRetries || 3,
          status: 'PENDING',
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('A download with the same URL and quality already exists.');
      }
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: Status,
    data?: Partial<Download>,
    tx?: Prisma.TransactionClient
  ): Promise<Download> {
    const client = tx || prisma;
    const updateData: any = { status, ...data };
    if (status === 'DOWNLOADING' && !data?.startedAt) {
      updateData.startedAt = new Date();
    }
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.progress = 100;
    }
    if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
    }
    return client.download.update({
      where: { id },
      data: updateData,
    });
  }

  async addHistory(
    id: string,
    status: Status,
    progress: number,
    error?: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx || prisma;
    await client.downloadHistory.create({
      data: {
        downloadId: id,
        status,
        progress,
        error,
      },
    });
  }

  async findById(id: string): Promise<any> {
    const record = await prisma.download.findUnique({ where: { id } });
    if (!record) return null;
    return {
      ...record,
      fileSize: record.fileSize !== null && record.fileSize !== undefined ? Number(record.fileSize) : null,
    };
  }

  async findActive(): Promise<Download[]> {
    return prisma.download.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING', 'DOWNLOADING'] },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findStale(timeoutMinutes: number = 30): Promise<Download[]> {
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    return prisma.download.findMany({
      where: {
        status: 'DOWNLOADING',
        startedAt: { lt: cutoff },
      },
    });
  }

  async updateProgress(id: string, progress: number): Promise<void> {
    await prisma.download.update({
      where: { id },
      data: { progress: Math.min(100, Math.max(0, progress)) },
    });
  }

  async findActiveByUrlAndQuality(url: string, quality: string): Promise<Download | null> {
    return prisma.download.findFirst({
      where: {
        url,
        quality,
        status: { in: ['PENDING', 'PROCESSING', 'DOWNLOADING'] },
      },
    });
  }

  async deleteOldFiles(maxAgeDays: number = 7): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
    const result = await prisma.download.updateMany({
      where: {
        status: 'COMPLETED',
        completedAt: { lt: cutoff },
        filePath: { not: null },
      },
      data: {
        filePath: null,
        filename: null,
      },
    });
    return result.count;
  }
}

export const downloadRepo = new DownloadRepository();
