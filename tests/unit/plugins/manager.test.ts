import { pluginManager } from '@/lib/plugins/PluginManager';
import { youtubePlugin } from '@/lib/plugins/youtube';
import { tiktokPlugin } from '@/lib/plugins/tiktok';

describe('PluginManager', () => {
  it('should detect YouTube URLs', () => {
    const plugin = pluginManager.detect('https://www.youtube.com/watch?v=test');
    expect(plugin).toBe(youtubePlugin);
  });

  it('should detect TikTok URLs', () => {
    const plugin = pluginManager.detect('https://www.tiktok.com/@user/video/123');
    expect(plugin).toBe(tiktokPlugin);
  });

  it('should return generic plugin for unknown URLs', () => {
    const plugin = pluginManager.detect('https://example.com/video.mp4');
    expect(plugin).not.toBeNull();
  });

  it('should return all plugins', () => {
    const plugins = pluginManager.getAll();
    expect(plugins.length).toBeGreaterThanOrEqual(3);
  });
});
