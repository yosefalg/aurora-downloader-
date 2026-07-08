import { logger } from '@/lib/monitoring/logger';

export async function sendSlackAlert(message: string, channel?: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        channel: channel || '#alerts',
      }),
    });
    logger.info('Slack alert sent', { message });
  } catch (error) {
    logger.error('Slack alert failed', { error });
  }
}
