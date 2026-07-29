import { delay, mockPlugins } from "@/mock/data";
import type { Plugin } from "@/types";

export interface PluginService {
  list(): Promise<Plugin[]>;
  toggle(id: string, installed: boolean): Promise<Plugin>;
}

export const pluginService: PluginService = {
  async list() {
    await delay(480);
    return mockPlugins;
  },
  async toggle(id, installed) {
    await delay(320);
    const plugin = mockPlugins.find((p) => p.id === id)!;
    return { ...plugin, installed };
  },
};