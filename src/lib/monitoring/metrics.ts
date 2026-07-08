import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

const register = new Registry();
collectDefaultMetrics({ register });

export const downloadsTotal = new Counter({
  name: 'downloads_total',
  help: 'Total number of downloads',
  labelNames: ['status', 'quality'],
  registers: [register],
});

export const downloadsActive = new Gauge({
  name: 'downloads_active',
  help: 'Currently active downloads',
  registers: [register],
});

export const downloadDuration = new Histogram({
  name: 'download_duration_seconds',
  help: 'Download duration in seconds',
  buckets: [5, 10, 30, 60, 120, 300, 600, 1800, 3600],
  registers: [register],
});

export const downloadSize = new Histogram({
  name: 'download_size_bytes',
  help: 'Download size in bytes',
  buckets: [1024 * 1024, 10 * 1024 * 1024, 100 * 1024 * 1024, 500 * 1024 * 1024, 1024 * 1024 * 1024],
  registers: [register],
});

export const downloadSpeed = new Histogram({
  name: 'download_speed_bytes_per_second',
  help: 'Download speed in bytes/second',
  buckets: [1024 * 1024, 5 * 1024 * 1024, 10 * 1024 * 1024, 50 * 1024 * 1024],
  registers: [register],
});

export const queueJobs = new Gauge({
  name: 'queue_jobs_total',
  help: 'Total jobs in queue',
  labelNames: ['status'],
  registers: [register],
});

export const queueErrors = new Counter({
  name: 'queue_errors_total',
  help: 'Total queue errors',
  labelNames: ['type'],
  registers: [register],
});

export const apiRequests = new Counter({
  name: 'api_requests_total',
  help: 'Total API requests',
  labelNames: ['path', 'method', 'status'],
  registers: [register],
});

export const apiDuration = new Histogram({
  name: 'api_duration_seconds',
  help: 'API request duration',
  labelNames: ['path'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export function getMetrics(): Promise<string> {
  return register.metrics();
}

export function getMetricsJSON(): Promise<any> {
  return register.getMetricsAsJSON();
}
