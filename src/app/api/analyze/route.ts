import { NextRequest, NextResponse } from 'next/server';
import { pluginManager } from '@/lib/plugins/PluginManager';
import { cache } from '@/lib/utils/cache';
import { rateLimit } from '@/lib/security/rateLimit';
import { analyzeRequestSchema } from '@/lib/security/validator';
import { logger } from '@/lib/monitoring/logger';
import { apiRequests, apiDuration } from '@/lib/monitoring/metrics';
import { ZodError } from 'zod';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const rate = await rateLimit(req);
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rate.limit.toString(),
            'X-RateLimit-Remaining': rate.remaining.toString(),
            'X-RateLimit-Reset': rate.reset.toString(),
          },
        }
      );
    }
    const body = await req.json();
    const { url } = analyzeRequestSchema.parse(body);
    const cacheKey = `analysis:${url}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      apiDuration.observe({ path: '/analyze' }, duration / 1000);
      apiRequests.inc({ path: '/analyze', method: 'POST', status: 200 });
      return NextResponse.json(JSON.parse(cached), {
        headers: { 'X-Cache': 'HIT' },
      });
    }
    const plugin = pluginManager.detect(url);
    if (!plugin) {
      apiRequests.inc({ path: '/analyze', method: 'POST', status: 400 });
      return NextResponse.json(
        { error: 'Unsupported platform' },
        { status: 400 }
      );
    }
    const [metadata, qualities, thumbnail, subtitles] = await Promise.all([
      plugin.extractMetadata(url),
      plugin.getAvailableQualities(url),
      plugin.getThumbnail(url),
      plugin.getSubtitles ? plugin.getSubtitles(url) : [],
    ]);
    const result = {
      ...metadata,
      qualities,
      thumbnail: thumbnail || metadata.thumbnail,
      subtitles,
      pluginId: plugin.id,
    };
    await cache.set(cacheKey, JSON.stringify(result), 3600);
    const duration = Date.now() - startTime;
    apiDuration.observe({ path: '/analyze' }, duration / 1000);
    apiRequests.inc({ path: '/analyze', method: 'POST', status: 200 });
    logger.info('Analysis completed', { url, plugin: plugin.id, duration });
    return NextResponse.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    apiDuration.observe({ path: '/analyze' }, duration / 1000);
    if (error instanceof ZodError) {
      apiRequests.inc({ path: '/analyze', method: 'POST', status: 400 });
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    apiRequests.inc({ path: '/analyze', method: 'POST', status: 500 });
    logger.error('Analysis error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
