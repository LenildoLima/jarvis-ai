import { motion } from "motion/react";
import { useAssistantStore } from "@/store/assistantStore";
import type { AssistantStatus } from "@/types";
import { cn } from "@/lib/utils";

const PALETTE: Record<AssistantStatus, { core: string; ring: string; halo: string; label: string }> = {
  idle: { core: "var(--neon)", ring: "var(--hud-line)", halo: "var(--neon)", label: "Em repouso" },
  listening: { core: "var(--cyan)", ring: "var(--cyan)", halo: "var(--cyan)", label: "Ouvindo" },
  processing: { core: "var(--violet)", ring: "var(--violet)", halo: "var(--violet)", label: "Processando" },
  speaking: { core: "var(--cyan)", ring: "var(--neon)", halo: "var(--neon)", label: "Respondendo" },
};

interface AIOrbProps {
  size?: number;
  className?: string;
  showLabel?: boolean;
}

export function AIOrb({ size = 320, className, showLabel = true }: AIOrbProps) {
  const status = useAssistantStore((s) => s.status);
  const amplitude = useAssistantStore((s) => s.amplitude);
  const palette = PALETTE[status];
  const active = status !== "idle";
  const pulse = status === "speaking" ? 1 + amplitude * 0.08 : active ? 1.03 : 1;

  return (
    <div className={cn("relative flex flex-col items-center gap-6", className)} style={{ width: size }}>
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle, color-mix(in oklab, ${palette.halo} 35%, transparent), transparent 62%)`, filter: "blur(28px)" }}
        animate={{ opacity: active ? [0.55, 0.9, 0.55] : [0.35, 0.55, 0.35], scale: [1, 1.06, 1] }}
        transition={{ duration: status === "processing" ? 1.6 : 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        role="img"
        aria-label={`Núcleo do assistente — ${palette.label}`}
        animate={{ scale: pulse }}
        transition={{ type: "spring", stiffness: 90, damping: 14 }}
      >
        <defs>
          <radialGradient id="orb-core" cx="50%" cy="42%">
            <stop offset="0%" stopColor={palette.core} stopOpacity="0.95" />
            <stop offset="55%" stopColor={palette.core} stopOpacity="0.28" />
            <stop offset="100%" stopColor={palette.core} stopOpacity="0.02" />
          </radialGradient>
          <linearGradient id="orb-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette.ring} stopOpacity="0.9" />
            <stop offset="60%" stopColor={palette.ring} stopOpacity="0.1" />
            <stop offset="100%" stopColor={palette.core} stopOpacity="0.8" />
          </linearGradient>
        </defs>

        <motion.g
          style={{ originX: "100px", originY: "100px" }}
          animate={{ rotate: 360 }}
          transition={{ duration: status === "processing" ? 6 : 26, repeat: Infinity, ease: "linear" }}
        >
          <circle cx="100" cy="100" r="88" fill="none" stroke="url(#orb-ring)" strokeWidth="0.8" strokeDasharray="6 10" />
          <circle cx="100" cy="100" r="74" fill="none" stroke={palette.ring} strokeOpacity="0.35" strokeWidth="0.6" strokeDasharray="2 14" />
        </motion.g>

        <motion.g
          style={{ originX: "100px", originY: "100px" }}
          animate={{ rotate: -360 }}
          transition={{ duration: status === "listening" ? 10 : 40, repeat: Infinity, ease: "linear" }}
        >
          <ellipse cx="100" cy="100" rx="82" ry="34" fill="none" stroke={palette.core} strokeOpacity="0.35" strokeWidth="0.7" />
          <ellipse cx="100" cy="100" rx="34" ry="82" fill="none" stroke={palette.core} strokeOpacity="0.22" strokeWidth="0.7" />
        </motion.g>

        <motion.circle
          key={`orb-core-${active}`}
          cx="100"
          cy="100"
          fill="url(#orb-core)"
          initial={{ r: active ? 54 : 52, opacity: 0.85 }}
          animate={{ r: active ? [54, 60, 54] : [52, 56, 52], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: status === "speaking" ? 1.1 : 3.4, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.circle
          cx="100"
          cy="100"
          r="26"
          fill={palette.core}
          fillOpacity="0.9"
          animate={{ scale: status === "speaking" ? [1, 1 + amplitude * 0.35, 1] : [1, 1.05, 1] }}
          transition={{ duration: status === "speaking" ? 0.5 : 2.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: "100px", originY: "100px", filter: "blur(1px)" }}
        />

        {Array.from({ length: 18 }).map((_, i) => {
          const angle = (i / 18) * Math.PI * 2;
          const radius = 68 + (i % 3) * 6;
          return (
            <motion.circle
              key={i}
              cx={100 + Math.cos(angle) * radius}
              cy={100 + Math.sin(angle) * radius}
              r={i % 4 === 0 ? 1.6 : 1}
              fill={palette.core}
              animate={{ opacity: active ? [0.15, 0.85, 0.15] : [0.08, 0.4, 0.08] }}
              transition={{ duration: 2.4, delay: i * 0.11, repeat: Infinity, ease: "easeInOut" }}
            />
          );
        })}
      </motion.svg>

      {showLabel && (
        <div className="text-center">
          <p className="font-display text-xs tracking-[0.42em] text-muted-foreground uppercase">
            {palette.label}
          </p>
        </div>
      )}
    </div>
  );
}