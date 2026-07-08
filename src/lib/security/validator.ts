import { z } from 'zod';
import { validateUrl } from './ssrf';

export const urlSchema = z.string().url().refine(
  async (url) => {
    const result = await validateUrl(url);
    return result.valid;
  },
  { message: 'Invalid or unsafe URL' }
);

export const downloadRequestSchema = z.object({
  url: urlSchema,
  quality: z.string().min(1).max(50),
  format: z.string().min(1).max(10).regex(/^[a-zA-Z0-9]+$/),
  subtitle: z.string().optional().max(10),
});

export const analyzeRequestSchema = z.object({
  url: urlSchema,
});

export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
};

export const sanitizeFilename = (input: string): string => {
  return input
    .replace(/[^a-zA-Z0-9\-_. ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
};
