import { NextResponse } from 'next/server';
import { getMetrics } from '@/lib/monitoring/metrics';

export async function GET() {
  if (process.env.METRICS_ENABLED !== 'true') {
    return new NextResponse('Metrics disabled', { status: 404 });
  }
  const metrics = await getMetrics();
  return new NextResponse(metrics, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
