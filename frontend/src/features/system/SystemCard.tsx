import { motion } from "motion/react";
import type { Metric } from "@/types";

export function SystemCard({ metric, accent = "var(--neon)" }: { metric: Metric; accent?: string }) {
  const points = metric.history
    .map((v, i) => `${(i / (metric.history.length - 1)) * 100},${40 - (v / 100) * 36}`)
    .join(" ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="hud-panel overflow-hidden p-5"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] tracking-[0.24em] text-muted-foreground uppercase">{metric.label}</span>
        <span className="font-display text-2xl tabular-nums" style={{ color: accent }}>
          {metric.value}
          <span className="ml-1 text-xs text-muted-foreground">{metric.unit}</span>
        </span>
      </div>
      <svg className="mt-4 h-24 w-full" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
        <polyline points={`0,40 ${points} 100,40`} fill={accent} fillOpacity="0.1" stroke="none" />
        <polyline points={points} fill="none" stroke={accent} strokeWidth="1.2" />
      </svg>
      {metric.detail && <p className="text-[11px] text-muted-foreground">{metric.detail}</p>}
    </motion.div>
  );
}