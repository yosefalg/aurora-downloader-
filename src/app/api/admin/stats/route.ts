import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { getDailyStats, getTopPlatforms, getBandwidthUsage } from '@/lib/analytics/reports';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if ('status' in admin) return admin; // It's a NextResponse error

  const [totalUsers, totalDownloads, activeDownloads, bandwidth] = await Promise.all([
    prisma.user.count(),
    prisma.download.count(),
    prisma.download.count({ where: { status: { in: ['PENDING', 'PROCESSING', 'DOWNLOADING'] } } }),
    getBandwidthUsage(30),
  ]);

  const todayStats = await getDailyStats(new Date());
  const topPlatforms = await getTopPlatforms(7);

  return NextResponse.json({
    overview: { totalUsers, totalDownloads, activeDownloads, bandwidth },
    today: todayStats,
    topPlatforms,
  });
}
