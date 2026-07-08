import { POST } from '@/app/api/analyze/route';

describe('Analyze API', () => {
  it('should return 400 for invalid URL', async () => {
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ url: 'invalid-url' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
