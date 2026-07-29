import { buildSystemStats, delay } from "@/mock/data";
import type { SystemStats } from "@/types";

export interface SystemService {
  getStats(seed?: number): Promise<SystemStats>;
}

export const systemService: SystemService = {
  async getStats(seed = 0) {
    await delay(380);
    return buildSystemStats(seed);
  },
};