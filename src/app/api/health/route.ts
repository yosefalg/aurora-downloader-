import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { redis } from '@/lib/queue';

export async function GET() {
  const checks = {
    database: false,
    redis: false,
    downloadEngine: false,
  };
  let errors: string[] = [];
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    errors.push('Database connection failed');
  }
  try {
    await redis.ping();
    checks.redis = true;
  } catch (error) {
    errors.push('Redis connection failed');
  }
  try {
    checks.downloadEngine = true;
  } catch (error) {
    errors.push('Download engine error');
  }
  const allHealthy = Object.values(checks).every(v => v === true);
  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
      errors: errors.length > 0 ? errors : undefined,
    },
    {
      status: allHealthy ? 200 : 503,
    }
  );
}
