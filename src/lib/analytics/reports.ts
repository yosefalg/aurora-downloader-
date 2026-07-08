import { prisma } from '@/lib/db/prisma';

export async function getDailyStats(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const [downloads, completed, failed, users] = await Promise.all([
    prisma.download.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.download.count({ where: { status: 'COMPLETED', completedAt: { gte: start, lte: end } } }),
    prisma.download.count({ where: { status: 'FAILED', createdAt: { gte: start, lte: end } } }),
    prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
  ]);

  return { downloads, completed, failed, users, date: start.toISOString().split('T')[0] };
}

export async function getTopPlatforms(days: number = 7): Promise<{ platform: string; count: number }[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const downloads = await prisma.download.findMany({
    where: { createdAt: { gte: cutoff } },
    select: { url: true },
  });

  const platforms: Record<string, number> = {};
  for (const d of downloads) {
    try {
      const hostname = new URL(d.url).hostname;
      const platform = hostname.replace('www.', '').split('.')[0];
      platforms[platform] = (platforms[platform] || 0) + 1;
    } catch {}
  }

  return Object.entries(platforms)
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export async function getBandwidthUsage(days: number = 7): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await prisma.download.aggregate({
    where: { status: 'COMPLETED', completedAt: { gte: cutoff } },
    _sum: { fileSize: true },
  });
  return result._sum.fileSize || 0;
}
