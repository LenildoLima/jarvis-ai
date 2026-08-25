import { create } from "zustand";
import { pluginService } from "@/services/pluginService";
import type { Plugin } from "@/types";

interface PluginState {
  plugins: Plugin[];
  initialized: boolean;
  loadPlugins: (token: string | null) => Promise<void>;
  togglePlugin: (token: string | null, id: string, installed: boolean) => Promise<void>;
  isPluginEnabled: (id: string) => boolean;
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],
  initialized: false,
  loadPlugins: async (token) => {
    if (!token) return;
    try {
      const plugins = await pluginService.list(token);
      set({ plugins, initialized: true });
    } catch (err) {
      console.error("Failed to load plugins in store:", err);
    }
  },
  togglePlugin: async (token, id, installed) => {
    if (!token) return;
    const oldPlugins = get().plugins;
    
    // Otimista
    set({ plugins: oldPlugins.map(p => p.id === id ? { ...p, installed } : p) });
    
    try {
      await pluginService.toggle(token, id, installed);
    } catch (err) {
      // Rollback
      set({ plugins: oldPlugins });
      throw err;
    }
  },
  isPluginEnabled: (id) => {
    const plugin = get().plugins.find(p => p.id === id);
    return plugin?.installed ?? false;
  }
}));
