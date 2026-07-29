import { useCallback, useState } from "react";
import { memoryService } from "@/services/memoryService";
import type { Memory } from "@/types";

export function useMemoryData() {
  const [items, setItems] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await memoryService.list("all"));
    } finally {
      setLoading(false);
    }
  }, []);

  return { items, loading, load };
}