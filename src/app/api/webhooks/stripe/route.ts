import { NextRequest, NextResponse } from 'next/server';
import { constructEvent } from '@/lib/payments/stripe';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/monitoring/logger';

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  try {
    const event = await constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET || '');

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        await prisma.user.update({
          where: { id: session.metadata.userId },
          data: { role: 'PRO' },
        });
        logger.info('Subscription activated', { userId: session.metadata.userId });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        logger.warn('Payment failed', { customer: invoice.customer });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await prisma.user.update({
          where: { id: subscription.metadata.userId },
          data: { role: 'USER' },
        });
        logger.info('Subscription cancelled', { userId: subscription.metadata.userId });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error('Stripe webhook error', { error });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
