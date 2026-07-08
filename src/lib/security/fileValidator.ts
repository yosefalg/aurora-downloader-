import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { logger } from '@/lib/monitoring/logger';

const execFileAsync = promisify(execFile);

const ALLOWED_MIME_TYPES = new Map([
  ['mp4', 'video/mp4'],
  ['webm', 'video/webm'],
  ['mkv', 'video/x-matroska'],
  ['mp3', 'audio/mpeg'],
  ['m4a', 'audio/mp4'],
  ['ogg', 'audio/ogg'],
  ['wav', 'audio/wav'],
  ['flac', 'audio/flac'],
  ['jpg', 'image/jpeg'],
  ['png', 'image/png'],
  ['gif', 'image/gif'],
]);

export async function validateFileType(filePath: string, expectedExt: string): Promise<{
  valid: boolean;
  mimeType?: string;
  error?: string;
}> {
  try {
    // Use `file` command for magic number detection
    const { stdout } = await execFileAsync('file', ['--mime-type', '-b', filePath]);
    const detectedMime = stdout.trim();

    const expectedMime = ALLOWED_MIME_TYPES.get(expectedExt.toLowerCase());
    if (!expectedMime) {
      return { valid: false, error: 'Unsupported file extension' };
    }

    // Check if detected MIME matches expected (or is a subtype)
    const isValid = detectedMime.startsWith(expectedMime.split('/')[0]) || 
                   detectedMime === expectedMime;

    if (!isValid) {
      logger.warn('MIME type mismatch', { 
        path: filePath, 
        expected: expectedMime, 
        detected: detectedMime 
      });
      return { valid: false, error: `MIME type mismatch: expected ${expectedMime}, got ${detectedMime}` };
    }

    return { valid: true, mimeType: detectedMime };
  } catch (error) {
    logger.error('File validation failed', { error, path: filePath });
    return { valid: false, error: 'Could not validate file type' };
  }
}

export function getAllowedExtensions(): string[] {
  return Array.from(ALLOWED_MIME_TYPES.keys());
}

export function sanitizeFileExtension(ext: string): string {
  const clean = ext.toLowerCase().replace(/^\./, '');
  return ALLOWED_MIME_TYPES.has(clean) ? clean : 'mp4';
}
