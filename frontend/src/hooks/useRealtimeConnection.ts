import { useEffect } from "react";
import { useAssistantStore } from "@/store/assistantStore";
import { useSystemStore } from "@/store/systemStore";

/**
 * Simula hoje eventos de telemetria com setInterval.
 * Ao migrar para WebSocket (VITE_WS_URL), apenas o corpo muda —
 * a interface pública deste hook permanece a mesma.
 */
export function useRealtimeConnection(enabled = true) {
  const load = useSystemStore((s) => s.load);
  const connection = useAssistantStore((s) => s.connection);

  useEffect(() => {
    if (!enabled || connection === "offline") return;
    let seed = 0;
    void load(seed);
    const id = setInterval(() => {
      seed += 1;
      void load(seed);
    }, 3000);
    return () => clearInterval(id);
  }, [enabled, connection, load]);

  return { connection };
}