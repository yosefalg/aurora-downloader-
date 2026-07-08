import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/monitoring/logger';

export async function trackEvent(
  event: string,
  properties: Record<string, any>,
  userId?: string
): Promise<void> {
  try {
    // Store in database for now
    // In production, send to Mixpanel/Amplitude/Segment
    await prisma.auditLog.create({
      data: {
        downloadId: properties.downloadId || 'system',
        action: `analytics:${event}`,
        details: properties,
        ip: properties.ip,
        userAgent: properties.userAgent,
      },
    });
  } catch (error) {
    logger.error('Analytics tracking failed', { error, event });
  }
}

export async function trackDownloadStart(
  downloadId: string,
  metadata: { url: string; quality: string; format: string; platform: string }
): Promise<void> {
  await trackEvent('download_start', { downloadId, ...metadata });
}

export async function trackDownloadComplete(
  downloadId: string,
  metadata: { duration: number; size: number; speed: number }
): Promise<void> {
  await trackEvent('download_complete', { downloadId, ...metadata });
}

export async function trackUserSignup(
  userId: string,
  metadata: { email: string; source?: string }
): Promise<void> {
  await trackEvent('user_signup', { userId, ...metadata });
}
