import { motion } from "motion/react";
import { Brain, BookOpen, History, Settings2 } from "lucide-react";
import type { Memory, MemoryKind } from "@/types";

const META: Record<MemoryKind, { icon: typeof Brain; label: string; color: string }> = {
  memory: { icon: Brain, label: "Lembrança", color: "var(--neon)" },
  preference: { icon: Settings2, label: "Preferência", color: "var(--cyan)" },
  knowledge: { icon: BookOpen, label: "Conhecimento", color: "var(--violet)" },
  history: { icon: History, label: "Histórico", color: "var(--cyan)" },
};

export function MemoryCard({ memory, index = 0 }: { memory: Memory; index?: number }) {
  const meta = META[memory.kind];
  const Icon = meta.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="hud-panel p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center gap-2">
        <Icon className="size-4" style={{ color: meta.color }} />
        <span className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{meta.label}</span>
      </div>
      <h3 className="mt-3 text-sm font-medium">{memory.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{memory.content}</p>
      <div className="mt-4 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary/60">
          <div className="h-full rounded-full" style={{ width: `${memory.confidence * 100}%`, background: meta.color }} />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {Math.round(memory.confidence * 100)}%
        </span>
      </div>
    </motion.article>
  );
}