import { BasePlugin, MediaMetadata, Quality } from './BasePlugin';

class GenericPlugin extends BasePlugin {
  id = 'generic';
  name = 'Generic';
  domains = [];

  detect(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  async extractMetadata(url: string): Promise<MediaMetadata> {
    const info = await this.runYtDlpJson(url);
    return {
      title: info.title || 'Unknown Media',
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
    if (formats.length === 0) {
      return [{
        id: 'best',
        label: 'Best Quality',
        resolution: 'best',
        format: info.ext || 'mp4',
        hasAudio: true,
        hasVideo: true,
      }];
    }
    return formats.map((fmt: any) => ({
      id: fmt.format_id,
      label: fmt.format_note || fmt.resolution || 'Original',
      resolution: fmt.resolution || 'unknown',
      format: fmt.ext || 'mp4',
      hasAudio: !!fmt.acodec && fmt.acodec !== 'none',
      hasVideo: !!fmt.vcodec && fmt.vcodec !== 'none',
    }));
  }

  async getThumbnail(url: string): Promise<string | null> {
    const info = await this.runYtDlpJson(url);
    return info.thumbnail || null;
  }
}

export const genericPlugin = new GenericPlugin();
