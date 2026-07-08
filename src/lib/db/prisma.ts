import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/monitoring/logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;
const poolSize = parseInt(process.env.DATABASE_POOL_SIZE || '20');

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  });

// Connection health check
let isHealthy = true;

prisma.$on('error', (e: any) => {
  isHealthy = false;
  logger.error('Database error', { error: e.message });
  // Attempt reconnection after delay
  setTimeout(() => {
    prisma.$connect().then(() => { isHealthy = true; }).catch(() => {});
  }, 5000);
});

prisma.$on('warn', (e: any) => {
  logger.warn('Database warning', { message: e.message });
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function withTransaction<T>(
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: 5000,
    timeout: 30000,
  });
}

export function isDatabaseHealthy(): boolean {
  return isHealthy;
}

export async function healthCheck(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    isHealthy = true;
    return true;
  } catch {
    isHealthy = false;
    return false;
  }
}
