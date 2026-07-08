import { isUrlSafe, validateUrl } from '@/lib/security/ssrf';

describe('SSRF Protection', () => {
  it('should block private IPs', async () => {
    const result = await validateUrl('http://127.0.0.1/admin');
    expect(result.valid).toBe(false);
  });

  it('should block localhost', async () => {
    const result = await validateUrl('http://localhost:3000');
    expect(result.valid).toBe(false);
  });

  it('should allow public URLs', async () => {
    const result = await validateUrl('https://www.youtube.com/watch?v=test');
    expect(result.valid).toBe(true);
  });

  it('should block invalid protocols', async () => {
    const result = await validateUrl('ftp://example.com');
    expect(result.valid).toBe(false);
  });
});
