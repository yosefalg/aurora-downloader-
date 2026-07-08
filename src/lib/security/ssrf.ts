import dns from 'dns/promises';
import { logger } from '@/lib/monitoring/logger';

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc/i,
  /^fd/i,
  /^fe80:/i,
  /^::ffff:0:0$/,
];

function isPrivateIP(ip: string): boolean {
  // Check IPv4 private ranges
  if (PRIVATE_IP_PATTERNS.some(p => p.test(ip))) return true;

  // Check IPv4 172.16-31
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;

  // Check IPv6 loopback and private
  if (ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd')) return true;

  return false;
}

// Blocked hostnames (internal services)
const BLOCKED_HOSTS = [
  'localhost',
  'metadata.google.internal',
  'metadata',
  '169.254.169.254', // AWS/GCP metadata
  'alibaba.xxx',
];

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return BLOCKED_HOSTS.some(b => lower === b || lower.endsWith('.' + b));
}

export async function isUrlSafe(urlString: string): Promise<{ safe: boolean; reason?: string }> {
  try {
    // Parse and canonicalize URL
    const url = new URL(urlString);

    // Protocol check
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { safe: false, reason: 'Only HTTP/HTTPS protocols allowed' };
    }

    // Hostname check
    const hostname = url.hostname.toLowerCase();
    if (isBlockedHost(hostname)) {
      return { safe: false, reason: 'Blocked hostname' };
    }

    // DNS resolution with timeout
    const addresses = await Promise.race([
      dns.resolve(hostname),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('DNS timeout')), 5000)
      ),
    ]).catch(() => [] as string[]);

    if (addresses.length === 0) {
      return { safe: false, reason: 'Could not resolve hostname' };
    }

    // Check all resolved IPs
    for (const ip of addresses) {
      if (isPrivateIP(ip)) {
        return { safe: false, reason: `Resolved to private IP: ${ip}` };
      }
    }

    // Port check (block common internal ports)
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');
    const blockedPorts = ['22', '25', '3306', '5432', '6379', '27017', '9200'];
    if (blockedPorts.includes(port)) {
      return { safe: false, reason: `Blocked port: ${port}` };
    }

    return { safe: true };
  } catch (error) {
    return { safe: false, reason: 'Invalid URL format' };
  }
}

export async function validateUrl(urlString: string): Promise<{ valid: boolean; error?: string }> {
  if (!urlString) return { valid: false, error: 'URL is required' };

  try {
    new URL(urlString);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  const result = await isUrlSafe(urlString);
  if (!result.safe) {
    return { valid: false, error: result.reason || 'URL is not allowed (SSRF protection)' };
  }

  return { valid: true };
}

// Additional: Validate redirect URLs
export function validateRedirectUrl(url: string, allowedDomains: string[]): boolean {
  try {
    const parsed = new URL(url);
    return allowedDomains.some(d => parsed.hostname.endsWith(d));
  } catch {
    return false;
  }
}
