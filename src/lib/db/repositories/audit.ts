import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export class AuditRepository {
  async log(
    downloadId: string,
    action: string,
    details?: any,
    ip?: string,
    userAgent?: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx || prisma;
    await client.auditLog.create({
      data: {
        downloadId,
        action,
        details: details || {},
        ip,
        userAgent,
      },
    });
  }

  async findByDownload(downloadId: string, limit: number = 100): Promise<any[]> {
    return prisma.auditLog.findMany({
      where: { downloadId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const auditRepo = new AuditRepository();
