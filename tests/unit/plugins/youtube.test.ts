import { youtubePlugin } from '@/lib/plugins/youtube';

describe('YouTube Plugin', () => {
  it('should detect YouTube URLs', () => {
    expect(youtubePlugin.detect('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(youtubePlugin.detect('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(youtubePlugin.detect('https://example.com')).toBe(false);
  });

  it('should have correct metadata', () => {
    expect(youtubePlugin.id).toBe('youtube');
    expect(youtubePlugin.name).toBe('YouTube');
  });
});
