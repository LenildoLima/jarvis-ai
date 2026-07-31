import { useEffect, useRef, useState } from "react";
import type { SystemStats } from "@/types";
import { env } from "@/config/env";

export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");

  const socketRef = useRef<WebSocket | null>(null);
  const historyRef = useRef<{
    cpu: number[];
    ram: number[];
    gpu: number[];
    temperature: number[];
    disk: number[];
    network: number[];
  }>({
    cpu: [],
    ram: [],
    gpu: [],
    temperature: [],
    disk: [],
    network: [],
  });

  useEffect(() => {
    let active = true;
    let reconnectTimeout: number | undefined;

    function connect() {
      if (!active) return;

      setConnectionStatus("connecting");
      const wsUrl = `${env.wsUrl}/system-stats`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!active) return;
        setConnectionStatus("connected");
      };

      socket.onmessage = (event) => {
        if (!active) return;
        try {
          const data = JSON.parse(event.data);
          
          const cpuVal = data.cpu_percent;
          const ramVal = data.ram_percent;
          const diskVal = data.disk_percent;
          const gpuVal = data.gpu_percent;
          const tempVal = data.temperature_celsius;
          const netSent = data.network_sent_kbps;
          const netRecv = data.network_recv_kbps;
          const netTotal = netSent + netRecv;

          const updateHistory = (key: keyof typeof historyRef.current, val: number | null) => {
            const arr = [...historyRef.current[key]];
            if (val === null) {
              return [];
            }
            if (arr.length === 0) {
              return Array(24).fill(val);
            }
            arr.push(val);
            if (arr.length > 24) {
              arr.shift();
            }
            return arr;
          };

          historyRef.current.cpu = updateHistory("cpu", cpuVal);
          historyRef.current.ram = updateHistory("ram", ramVal);
          historyRef.current.gpu = updateHistory("gpu", gpuVal);
          historyRef.current.temperature = updateHistory("temperature", tempVal);
          historyRef.current.disk = updateHistory("disk", diskVal);
          historyRef.current.network = updateHistory("network", netTotal);

          const ramCapacity = 16;
          const ramUsed = (ramVal * ramCapacity) / 100;
          const ramDetail = `${ramUsed.toFixed(1)} / ${ramCapacity} GB`;
          const networkDetail = `↑ ${netSent.toFixed(1)} KB/s · ↓ ${netRecv.toFixed(1)} KB/s`;

          const mappedStats: SystemStats = {
            cpu: {
              label: "CPU",
              value: cpuVal,
              unit: "%",
              detail: "Uso de processamento",
              history: historyRef.current.cpu,
            },
            ram: {
              label: "RAM",
              value: ramVal,
              unit: "%",
              detail: ramDetail,
              history: historyRef.current.ram,
            },
            gpu: {
              label: "GPU",
              value: gpuVal,
              unit: "%",
              detail: gpuVal !== null ? "Chip gráfico ativo" : "Indisponível",
              history: historyRef.current.gpu,
            },
            temperature: {
              label: "Temperatura",
              value: tempVal,
              unit: "°C",
              detail: tempVal !== null ? "Núcleo estável" : "Indisponível",
              history: historyRef.current.temperature,
            },
            disk: {
              label: "Disco",
              value: diskVal,
              unit: "%",
              detail: "Armazenamento principal",
              history: historyRef.current.disk,
            },
            network: {
              label: "Rede",
              value: parseFloat(netTotal.toFixed(1)),
              unit: "KB/s",
              detail: networkDetail,
              history: historyRef.current.network,
            },
            processes: [],
            updatedAt: new Date().toISOString(),
          };

          setStats(mappedStats);
        } catch (err) {
          console.error("Error parsing system stats JSON:", err);
        }
      };

      socket.onerror = () => {
        if (!active) return;
        setConnectionStatus("error");
      };

      socket.onclose = () => {
        if (!active) return;
        setConnectionStatus("disconnected");
        reconnectTimeout = window.setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      active = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return { stats, connectionStatus };
}
