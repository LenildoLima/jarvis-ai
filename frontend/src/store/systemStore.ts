import { create } from "zustand";
import { systemService } from "@/services/systemService";
import type { SystemStats } from "@/types";

interface SystemState {
  stats: SystemStats | null;
  loading: boolean;
  load: (seed?: number) => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  stats: null,
  loading: false,
  async load(seed = 0) {
    set((s) => ({ loading: s.stats === null }));
    const stats = await systemService.getStats(seed);
    set({ stats, loading: false });
  },
}));