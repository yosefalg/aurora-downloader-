import { NextRequest, NextResponse } from 'next/server';
import { downloadRepo } from '@/lib/db/repositories/download';
import { rateLimit } from '@/lib/security/rateLimit';
import { validateFileType } from '@/lib/security/fileValidator';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/monitoring/logger';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const rate = await rateLimit(req);
  if (!rate.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { id } = params;
  const record = await downloadRepo.findById(id);
  if (!record || record.status !== 'COMPLETED' || !record.filePath) {
    return NextResponse.json({ error: 'File not available' }, { status: 404 });
  }

  // Verify file exists
  if (!fs.existsSync(record.filePath)) {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
  }

  // Validate MIME type
  const ext = path.extname(record.filePath).slice(1);
  const validation = await validateFileType(record.filePath, ext);
  if (!validation.valid) {
    logger.error('File validation failed', { id, error: validation.error });
    return NextResponse.json({ error: 'File validation failed' }, { status: 400 });
  }

  const stats = fs.statSync(record.filePath);
  const filename = record.filename || 'download';

  // Handle range requests for resumable downloads
  const range = req.headers.get('range');
  let start = 0;
  let end = stats.size - 1;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    start = parseInt(parts[0], 10);
    end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
  }

  const stream = fs.createReadStream(record.filePath, { start, end });
  const headers: Record<string, string> = {
    'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    'Content-Type': validation.mimeType || 'application/octet-stream',
    'Cache-Control': 'public, max-age=86400',
    'Accept-Ranges': 'bytes',
  };

  if (range) {
    headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
    headers['Content-Length'] = String(end - start + 1);
  } else {
    headers['Content-Length'] = String(stats.size);
  }

  logger.info('File download streaming', { 
    downloadId: id, 
    filename, 
    size: stats.size,
    range: range || 'full' 
  });

  return new Response(stream as any, { 
    status: range ? 206 : 200, 
    headers 
  });
}
