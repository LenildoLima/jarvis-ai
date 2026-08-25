import { motion } from "motion/react";
import { Cpu, Gauge, HardDrive, MemoryStick, Thermometer, Wifi } from "lucide-react";
import { useSystemStats } from "@/hooks/useSystemStats";
import { useSystemStatsStore } from "@/store/systemStatsStore";
import { cn } from "@/lib/utils";
import { usePluginStore } from "@/store/pluginStore";

interface MiniMetricProps {
  icon: React.ElementType;
  label: string;
  value: number | null;
  unit: string;
  color: string;
  pct: number;
}

function MiniMetric({ icon: Icon, label, value, unit, color, pct }: MiniMetricProps) {
  const hasValue = value !== null && value !== undefined;

  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <Icon className="size-3.5 shrink-0" style={{ color }} />
      <span className="hidden text-[10px] tracking-widest text-muted-foreground uppercase sm:inline">
        {label}
      </span>
      <span className="font-display tabular-nums text-[11px]" style={{ color }}>
        {hasValue ? value : "—"}
        {hasValue && <span className="ml-0.5 text-[9px] text-muted-foreground">{unit}</span>}
      </span>
      <div className="hidden h-1 w-14 overflow-hidden rounded-full bg-secondary/60 xl:block">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 30%, transparent))`,
          }}
          animate={{ width: `${hasValue ? pct : 0}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />
      </div>
    </div>
  );
}

export function MetricsBar() {
  const { stats } = useSystemStats();
  const connectionStatus = useSystemStatsStore((s) => s.connectionStatus);
  const { isPluginEnabled, initialized } = usePluginStore();
  const isEnabled = isPluginEnabled("plg_sys");

  // While checking if plugin is enabled, show skeletons
  if (!initialized) {
    return (
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/60 bg-background/40 px-4 backdrop-blur-md">
        <div className="flex items-center divide-x divide-border/40">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-3">
              <div className="size-3.5 animate-pulse rounded bg-secondary/60" />
              <div className="hidden h-2 w-10 animate-pulse rounded bg-secondary/60 sm:block" />
              <div className="h-2 w-6 animate-pulse rounded bg-secondary/60" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If explicitly disabled by user
  if (!isEnabled) {
    return (
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/60 bg-background/40 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2 px-3">
          <span className="text-[11px] font-display uppercase tracking-widest text-muted-foreground">
            Telemetria desativada
          </span>
        </div>
        <div className="flex items-center gap-1.5 pl-4 text-[9px] tracking-widest text-muted-foreground uppercase">
          <span className="relative size-1.5 rounded-full bg-rose-500" />
          <span className="hidden sm:inline">offline</span>
        </div>
      </div>
    );
  }

  const metrics = stats
    ? [
        {
          icon: Cpu,
          label: "CPU",
          value: stats.cpu.value,
          unit: "%",
          color: "var(--neon)",
          pct: Math.min(100, stats.cpu.value ?? 0),
        },
        {
          icon: MemoryStick,
          label: "RAM",
          value: stats.ram.value,
          unit: "%",
          color: "var(--cyan)",
          pct: Math.min(100, stats.ram.value ?? 0),
        },
        {
          icon: Gauge,
          label: "GPU",
          value: stats.gpu.value,
          unit: "%",
          color: "var(--violet)",
          pct: Math.min(100, stats.gpu.value ?? 0),
        },
        {
          icon: Thermometer,
          label: "Temp",
          value: stats.temperature.value,
          unit: "°C",
          color: "var(--cyan)",
          pct: Math.min(100, ((stats.temperature.value ?? 0) / 100) * 100),
        },
        {
          icon: HardDrive,
          label: "Disco",
          value: stats.disk.value,
          unit: "%",
          color: "var(--neon)",
          pct: Math.min(100, stats.disk.value ?? 0),
        },
        {
          icon: Wifi,
          label: "Rede",
          value: stats.network.value,
          unit: "KB/s",
          color: "var(--violet)",
          pct: Math.min(100, (stats.network.value ?? 0) * 2),
        },
      ]
    : null;

  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/60 bg-background/40 px-4 backdrop-blur-md">
      <div className="flex items-center divide-x divide-border/40">
        {metrics ? (
          metrics.map((m) => (
            <MiniMetric key={m.label} {...m} />
          ))
        ) : (
          /* esqueleto enquanto não conecta */
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-3">
              <div className="size-3.5 animate-pulse rounded bg-secondary/60" />
              <div className="hidden h-2 w-10 animate-pulse rounded bg-secondary/60 sm:block" />
              <div className="h-2 w-6 animate-pulse rounded bg-secondary/60" />
            </div>
          ))
        )}
      </div>

      {/* indicador de conexão WebSocket */}
      <div className="flex items-center gap-1.5 pl-4 text-[9px] tracking-widest text-muted-foreground uppercase">
        <span
          className={cn(
            "relative size-1.5 rounded-full",
            connectionStatus === "connected" && "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]",
            connectionStatus === "connecting" && "bg-yellow-500",
            connectionStatus === "disconnected" && "bg-rose-500",
            connectionStatus === "error" && "bg-rose-500",
          )}
        >
          {connectionStatus === "connecting" && (
            <span className="absolute inset-0 animate-ping rounded-full bg-yellow-500 opacity-75" />
          )}
        </span>
        <span className="hidden sm:inline">
          {connectionStatus === "connected" && "ao vivo"}
          {connectionStatus === "connecting" && "conectando"}
          {connectionStatus === "disconnected" && "offline"}
          {connectionStatus === "error" && "erro"}
        </span>
      </div>
    </div>
  );
}
