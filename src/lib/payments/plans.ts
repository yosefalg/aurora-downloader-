export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    dailyDownloads: number;
    maxFileSize: number;
    maxParallel: number;
    maxQueueSize: number;
  };
}

export const PLANS: Record<string, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Basic downloads for casual users',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: ['5 downloads/day', '720p max quality', 'Basic support'],
    limits: { dailyDownloads: 5, maxFileSize: 500 * 1024 * 1024, maxParallel: 1, maxQueueSize: 3 },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Unlimited downloads with premium features',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: ['Unlimited downloads', '4K quality', 'Priority queue', 'Subtitles', 'API access', 'Priority support'],
    limits: { dailyDownloads: -1, maxFileSize: 10 * 1024 * 1024 * 1024, maxParallel: 4, maxQueueSize: 100 },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for teams',
    price: 49.99,
    currency: 'USD',
    interval: 'month',
    features: ['Everything in Pro', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'Team management'],
    limits: { dailyDownloads: -1, maxFileSize: 50 * 1024 * 1024 * 1024, maxParallel: 10, maxQueueSize: 1000 },
  },
};

export function getPlan(planId: string): Plan {
  return PLANS[planId] || PLANS.free;
}

export function checkDownloadLimit(planId: string, dailyCount: number): boolean {
  const plan = getPlan(planId);
  if (plan.limits.dailyDownloads === -1) return true;
  return dailyCount < plan.limits.dailyDownloads;
}
