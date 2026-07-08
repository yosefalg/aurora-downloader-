import { BasePlugin } from './BasePlugin';
import { youtubePlugin } from './youtube';
import { tiktokPlugin } from './tiktok';
import { genericPlugin } from './generic';

export class PluginManager {
  private plugins: BasePlugin[] = [
    youtubePlugin,
    tiktokPlugin,
    genericPlugin,
  ];

  detect(url: string): BasePlugin | null {
    for (const plugin of this.plugins) {
      if (plugin.detect(url)) {
        return plugin;
      }
    }
    return null;
  }

  register(plugin: BasePlugin): void {
    this.plugins.unshift(plugin);
  }

  getAll(): BasePlugin[] {
    return [...this.plugins];
  }
}

export const pluginManager = new PluginManager();
