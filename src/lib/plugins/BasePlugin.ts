import { spawn } from 'child_process';

export interface MediaMetadata {
  title: string;
  uploader?: string;
  duration?: number;
  description?: string;
  thumbnail?: string;
  url: string;
}

export interface Quality {
  id: string;
  label: string;
  resolution: string;
  format: string;
  hasAudio: boolean;
  hasVideo: boolean;
}

export interface Subtitle {
  language: string;
  url?: string;
}

export abstract class BasePlugin {
  abstract id: string;
  abstract name: string;
  abstract domains: string[];

  abstract detect(url: string): boolean;
  abstract extractMetadata(url: string): Promise<MediaMetadata>;
  abstract getAvailableQualities(url: string): Promise<Quality[]>;
  abstract getThumbnail(url: string): Promise<string | null>;
  abstract getSubtitles?(url: string): Promise<Subtitle[]>;

  protected async runYtDlpJson(url: string, args: string[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const proc = spawn('yt-dlp', ['-J', '--no-warnings', ...args, url]);
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      proc.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(stdout));
          } catch (error) {
            reject(new Error(`JSON parse failed: ${error}`));
          }
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
        }
      });
      proc.on('error', reject);
    });
  }

  protected formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
