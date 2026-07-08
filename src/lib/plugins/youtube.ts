import { BasePlugin, MediaMetadata, Quality, Subtitle } from './BasePlugin';

class YouTubePlugin extends BasePlugin {
  id = 'youtube';
  name = 'YouTube';
  domains = ['youtube.com', 'youtu.be', 'youtube-nocookie.com'];

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
      title: info.title || 'Unknown',
      uploader: info.uploader || info.channel,
      duration: info.duration,
      description: info.description,
      thumbnail: info.thumbnail,
      url,
    };
  }

  async getAvailableQualities(url: string): Promise<Quality[]> {
    const info = await this.runYtDlpJson(url, ['--list-formats']);
    const formats = info.formats || [];
    const qualities: Quality[] = [];

    for (const fmt of formats) {
      qualities.push({
        id: fmt.format_id,
        label: fmt.format_note || fmt.resolution || fmt.quality_label || 'Unknown',
        resolution: fmt.resolution || 'unknown',
        format: fmt.ext || 'mp4',
        hasAudio: !!fmt.acodec && fmt.acodec !== 'none',
        hasVideo: !!fmt.vcodec && fmt.vcodec !== 'none',
      });
    }

    // Add best audio-only option
    qualities.push({
      id: 'bestaudio',
      label: 'Best Audio',
      resolution: 'audio',
      format: 'mp3',
      hasAudio: true,
      hasVideo: false,
    });

    return qualities;
  }

  async getThumbnail(url: string): Promise<string | null> {
    const info = await this.runYtDlpJson(url);
    return info.thumbnail || null;
  }

  async getSubtitles(url: string): Promise<Subtitle[]> {
    const info = await this.runYtDlpJson(url, ['--list-subs']);
    const subs = info.subtitles || {};
    return Object.keys(subs).map(lang => ({
      language: lang,
      url: subs[lang]?.[0]?.url,
    }));
  }
}

export const youtubePlugin = new YouTubePlugin();
