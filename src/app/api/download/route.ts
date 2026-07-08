import { NextRequest, NextResponse } from 'next/server';
import { downloadManager } from '@/lib/download/manager';
import { rateLimit } from '@/lib/security/rateLimit';
import { downloadRequestSchema } from '@/lib/security/validator';
import { logger } from '@/lib/monitoring/logger';
import { apiRequests, apiDuration } from '@/lib/monitoring/metrics';
import { downloadQueue } from '@/lib/queue';
import { ZodError } from 'zod';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const rate = await rateLimit(req);
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rate.limit.toString(),
            'X-RateLimit-Remaining': rate.remaining.toString(),
            'X-RateLimit-Reset': rate.reset.toString(),
          },
        }
      );
    }
    const pendingCount = await downloadQueue.getJobCounts();
    const totalPending = pendingCount.waiting + pendingCount.active + pendingCount.delayed;
    const MAX_QUEUE_SIZE = parseInt(process.env.MAX_QUEUE_SIZE || '10000');
    if (totalPending > MAX_QUEUE_SIZE) {
      return NextResponse.json(
        { error: 'Queue is full. Please try again later.' },
        { status: 429 }
      );
    }
    const body = await req.json();
    const { url, quality, format, subtitle } = downloadRequestSchema.parse(body);
    const sessionId = req.cookies.get('sessionId')?.value;
    const userId = req.headers.get('x-user-id') || undefined;
    const id = await downloadManager.submit({
      url,
      quality,
      format,
      subtitle,
      userId,
      sessionId,
      priority: 0,
    });
    const duration = Date.now() - startTime;
    apiDuration.observe({ path: '/download' }, duration / 1000);
    apiRequests.inc({ path: '/download', method: 'POST', status: 202 });
    logger.info('Download job created', { jobId: id, url });
    return NextResponse.json(
      { id, status: 'pending', message: 'Download started' },
      { status: 202 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    apiDuration.observe({ path: '/download' }, duration / 1000);
    if (error instanceof ZodError) {
      apiRequests.inc({ path: '/download', method: 'POST', status: 400 });
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    apiRequests.inc({ path: '/download', method: 'POST', status: 500 });
    logger.error('Download creation error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
