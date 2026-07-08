export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/lib/monitoring/logger');
    await import('@/lib/monitoring/metrics');
  }
}
