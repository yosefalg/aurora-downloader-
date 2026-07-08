import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/security/rateLimit';
import { logger } from '@/lib/monitoring/logger';
import { apiRequests } from '@/lib/monitoring/metrics';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith('/_next') || path.startsWith('/favicon.ico') || path.startsWith('/api/health')) {
    return NextResponse.next();
  }
  const startTime = Date.now();
  if (path.startsWith('/api/')) {
    const rate = await rateLimit(request);
    if (!rate.success) {
      logger.warn('Rate limit exceeded', { ip: request.ip, path });
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rate.limit.toString(),
          'X-RateLimit-Remaining': rate.remaining.toString(),
          'X-RateLimit-Reset': rate.reset.toString(),
        },
      });
    }
  }
  const response = NextResponse.next();
  if (!request.cookies.get('sessionId')) {
    const { randomUUID } = await import('crypto');
    const sessionId = randomUUID();
    response.cookies.set('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
  }
  if (path.startsWith('/api/')) {
    const duration = Date.now() - startTime;
    const status = response.status || 200;
    apiRequests.inc({ path, method: request.method, status: status.toString() });
    logger.debug('API request', { path, method: request.method, status, duration, ip: request.ip });
  }
  return response;
}

export const config = {
  matcher: ['/:path*'],
};
