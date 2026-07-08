import webpush from 'web-push';
import { logger } from '@/lib/monitoring/logger';

webpush.setVapidDetails(
  'mailto:admin@aurora.app',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; icon?: string; url?: string }
): Promise<void> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    logger.info('Push notification sent');
  } catch (error) {
    logger.error('Push notification failed', { error });
  }
}
