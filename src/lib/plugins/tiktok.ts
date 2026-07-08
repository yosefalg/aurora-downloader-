import { BasePlugin, MediaMetadata, Quality } from './BasePlugin';

class TikTokPlugin extends BasePlugin {
  id = 'tiktok';
  name = 'TikTok';
  domains = ['tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'];

  detect(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return this.domains.some(d => hostname.includes(d));
    } catch {
      return false;
    }
  }

  async extractMetadata(url: string): Promise<MediaMetadata> {
    const info = await this.runYtDlpJson(url);
    return {
      title: info.title || 'TikTok Video',
      uploader: info.uploader,
      duration: info.duration,
      description: info.description,
      thumbnail: info.thumbnail,
      url,
    };
  }

  async getAvailableQualities(url: string): Promise<Quality[]> {
    const info = await this.runYtDlpJson(url);
    const formats = info.formats || [];
    return formats.map((fmt: any) => ({
      id: fmt.format_id,
      label: fmt.format_note || fmt.resolution || 'Original',
      resolution: fmt.resolution || 'unknown',
      format: fmt.ext || 'mp4',
      hasAudio: true,
      hasVideo: true,
    }));
  }

  async getThumbnail(url: string): Promise<string | null> {
    const info = await this.runYtDlpJson(url);
    return info.thumbnail || null;
  }
}

export const tiktokPlugin = new TikTokPlugin();
