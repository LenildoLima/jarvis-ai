import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import type { Metric } from "@/types";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  metric: Metric;
  icon: LucideIcon;
  accent?: "neon" | "cyan" | "violet";
  compact?: boolean;
}

const ACCENTS = {
  neon: "var(--neon)",
  cyan: "var(--cyan)",
  violet: "var(--violet)",
} as const;

export function StatusCard({ metric, icon: Icon, accent = "neon", compact }: StatusCardProps) {
  const color = ACCENTS[accent];
  const hasValue = metric.value !== null && metric.value !== undefined;
  const pct = hasValue
    ? Math.min(100, metric.unit === "%" || metric.unit === "°C" ? metric.value : metric.value * 2)
    : 0;

  return (
    <div className={cn("hud-panel group relative overflow-hidden p-4 transition-colors hover:border-primary/40", compact && "p-3")}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4" style={{ color }} />
          <span className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{metric.label}</span>
        </div>
        <span className="font-display text-lg tabular-nums" style={{ color }}>
          {hasValue ? metric.value : "—"}
          {hasValue && <span className="ml-0.5 text-[10px] text-muted-foreground">{metric.unit}</span>}
        </span>
      </div>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary/60">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 30%, transparent))` }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />
      </div>

      {!compact && metric.detail && (
        <p className="mt-2 text-[11px] text-muted-foreground">{metric.detail}</p>
      )}

      {metric.history && metric.history.length > 0 && (
        <svg className="mt-2 h-8 w-full" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden>
          <polyline
            points={metric.history
              .map((v, i) => `${(i / Math.max(1, metric.history.length - 1)) * 100},${32 - (v / 100) * 30}`)
              .join(" ")}
            fill="none"
            stroke={color}
            strokeOpacity="0.6"
            strokeWidth="1"
          />
        </svg>
      )}
    </div>
  );
}