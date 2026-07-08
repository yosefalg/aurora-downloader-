export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

export function sanitizeFilename(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9\-_. ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

export function sanitizeUrl(input: string): string {
  try {
    const url = new URL(input);
    return url.toString();
  } catch {
    return '';
  }
}
