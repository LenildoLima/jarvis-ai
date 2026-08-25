/**
 * useSystemStats — wrapper leve sobre o systemStatsStore.
 *
 * Mantém a mesma API pública de antes ({ stats, connectionStatus })
 * para não quebrar importações existentes, mas agora todos os
 * chamadores compartilham a mesma instância do WebSocket.
 */
import { useSystemStatsStore } from "@/store/systemStatsStore";

export function useSystemStats() {
  const stats = useSystemStatsStore((s) => s.stats);
  const connectionStatus = useSystemStatsStore((s) => s.connectionStatus);
  return { stats, connectionStatus };
}
