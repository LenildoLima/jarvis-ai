/**
 * systemStatsStore — fonte única de verdade para os dados de telemetria.
 *
 * Um único WebSocket é aberto aqui e compartilhado por todos os
 * componentes que chamam `useSystemStatsStore()`. Nem a Topbar nem a
 * página /system abrem conexões próprias; ambas apenas lêem este estado.
 */
import { create } from "zustand";
import type { SystemStats, Metric } from "@/types";
import { env } from "@/config/env";

type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

interface SystemStatsState {
  stats: SystemStats | null;
  connectionStatus: ConnectionStatus;
  /** Inicia a conexão WS; chamado pela raiz da app quando o plugin é ativado. */
  connect: () => void;
  /** Encerra a conexão WS; chamado quando o plugin é desativado. */
  disconnect: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Estado privado fora do store (não causa re-renders)
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let active = false;

const historyRef: {
  cpu: number[];
  ram: number[];
  gpu: number[];
  temperature: number[];
  disk: number[];
  network: number[];
  [key: string]: number[]; // disco extra por nome
} = {
  cpu: [],
  ram: [],
  gpu: [],
  temperature: [],
  disk: [],
  network: [],
};

function updateHistory(arr: number[], val: number | null, size = 24): number[] {
  if (val === null) return [];
  if (arr.length === 0) return Array(size).fill(val);
  const next = [...arr, val];
  if (next.length > size) next.shift();
  return next;
}
// ────────────────────────────────────────────────────────────────────────────

export const useSystemStatsStore = create<SystemStatsState>((set) => {
  function openSocket() {
    if (!active) return;

    set({ connectionStatus: "connecting" });
    const wsUrl = `${env.wsUrl}/system-stats`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      if (!active) return;
      set({ connectionStatus: "connected" });
    };

    socket.onmessage = (event) => {
      if (!active) return;
      try {
        const data = JSON.parse(event.data as string);

        const cpuVal: number = data.cpu_percent;
        const ramVal: number = data.ram_percent;
        const diskVal: number = data.disk_percent;
        const gpuVal: number | null = data.gpu_percent ?? null;
        const tempVal: number | null = data.temperature_celsius ?? null;
        const netSent: number = data.network_sent_kbps;
        const netRecv: number = data.network_recv_kbps;
        const netTotal = netSent + netRecv;

        const cpuCores: number | null = data.cpu_cores ?? null;
        const cpuFreq: number | null = data.cpu_freq_ghz ?? null;
        const ramTotal: number | null = data.ram_total_gb ?? null;
        const ramUsed: number | null = data.ram_used_gb ?? null;
        const diskTotal: number | null = data.disk_total_gb ?? null;
        const diskUsed: number | null = data.disk_used_gb ?? null;
        const gpuName: string | null = data.gpu_name ?? null;
        const disksRaw: { name: string; used_gb: number; total_gb: number; percent: number }[] =
          data.disks ?? [];

        historyRef.cpu = updateHistory(historyRef.cpu, cpuVal);
        historyRef.ram = updateHistory(historyRef.ram, ramVal);
        historyRef.gpu = updateHistory(historyRef.gpu, gpuVal);
        historyRef.temperature = updateHistory(historyRef.temperature, tempVal);
        historyRef.disk = updateHistory(historyRef.disk, diskVal);
        historyRef.network = updateHistory(historyRef.network, netTotal);

        // Histórico por disco individual (chave = nome sanitizado)
        const diskMetrics: Metric[] = disksRaw.map((d) => {
          const key = `disk_${d.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
          if (!historyRef[key]) historyRef[key] = [];
          historyRef[key] = updateHistory(historyRef[key], d.percent);
          return {
            label: d.name.replace(/\\$/, "").replace(/\/$/, ""), // ex: "C:", "D:"
            value: parseFloat(d.percent.toFixed(1)),
            unit: "%",
            detail: `${(d.total_gb - d.used_gb).toFixed(1).replace('.', ',')} GB livre(s) de ${d.total_gb.toFixed(1).replace('.', ',')} GB`,
            history: historyRef[key],
          };
        });

        const cpuDetail =
          cpuCores && cpuFreq ? `${cpuCores} núcleos · ${cpuFreq} GHz` : "Uso de processamento";
        const ramDetail =
          ramUsed && ramTotal ? `${ramUsed} / ${ramTotal} GB` : "Uso de memória";
        const diskDetail =
          diskUsed != null && diskTotal != null
            ? `${(diskTotal - diskUsed).toFixed(1).replace('.', ',')} GB livre(s) de ${diskTotal.toFixed(1).replace('.', ',')} GB`
            : "Armazenamento principal";
        const gpuDetail = gpuName || "GPU não detectada";
        const tempDetail = tempVal !== null ? "Núcleo estável" : "Sensor indisponível";
        const networkDetail = `↑ ${netSent.toFixed(1)} KB/s · ↓ ${netRecv.toFixed(1)} KB/s`;

        const mappedStats: SystemStats = {
          cpu: {
            label: "CPU",
            value: cpuVal,
            unit: "%",
            detail: cpuDetail,
            history: historyRef.cpu,
          },
          ram: {
            label: "RAM",
            value: ramVal,
            unit: "%",
            detail: ramDetail,
            history: historyRef.ram,
          },
          gpu: {
            label: "GPU",
            value: gpuVal,
            unit: "%",
            detail: gpuDetail,
            history: historyRef.gpu,
          },
          temperature: {
            label: "Temperatura",
            value: tempVal,
            unit: "°C",
            detail: tempDetail,
            history: historyRef.temperature,
          },
          disk: {
            label: "Disco",
            value: diskVal,
            unit: "%",
            detail: diskDetail,
            history: historyRef.disk,
          },
          network: {
            label: "Rede",
            value: parseFloat(netTotal.toFixed(1)),
            unit: "KB/s",
            detail: networkDetail,
            history: historyRef.network,
          },
          disks: diskMetrics,
          processes: [],
          updatedAt: new Date().toISOString(),
        };

        set({ stats: mappedStats });
      } catch (err) {
        console.error("systemStatsStore: erro ao parsear JSON:", err);
      }
    };

    socket.onerror = () => {
      if (!active) return;
      set({ connectionStatus: "error" });
    };

    socket.onclose = () => {
      if (!active) return;
      set({ connectionStatus: "disconnected" });
      reconnectTimer = setTimeout(openSocket, 3000);
    };
  }

  return {
    stats: null,
    connectionStatus: "idle",

    connect() {
      if (active) return; // já conectado — não abre segunda conexão
      active = true;
      openSocket();
    },

    disconnect() {
      active = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (socket) {
        socket.close();
        socket = null;
      }
      set({ stats: null, connectionStatus: "idle" });
    },
  };
});
