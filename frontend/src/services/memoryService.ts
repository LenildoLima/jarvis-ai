import { delay, mockMemories } from "@/mock/data";
import type { Memory, MemoryKind } from "@/types";

export interface MemoryService {
  list(kind?: MemoryKind | "all"): Promise<Memory[]>;
  remove(id: string): Promise<void>;
}

export const memoryService: MemoryService = {
  async list(kind = "all") {
    await delay(520);
    return kind === "all" ? mockMemories : mockMemories.filter((m) => m.kind === kind);
  },
  async remove() {
    await delay(200);
  },
};