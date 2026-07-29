import { motion } from "motion/react";
import {
  Calendar,
  CircuitBoard,
  Cpu,
  Home,
  Mail,
  MessageCircle,
  Music,
  Puzzle,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Plugin } from "@/types";

const ICONS: Record<string, LucideIcon> = {
  calendar: Calendar,
  music: Music,
  "message-circle": MessageCircle,
  mail: Mail,
  cpu: Cpu,
  home: Home,
  "circuit-board": CircuitBoard,
};

export function PluginCard({
  plugin,
  index = 0,
  onToggle,
}: {
  plugin: Plugin;
  index?: number;
  onToggle: (id: string, installed: boolean) => void;
}) {
  const Icon = ICONS[plugin.icon] ?? Puzzle;
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      whileHover={{ y: -3 }}
      className="hud-panel flex flex-col gap-3 p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between">
        <span className="ring-glow flex size-10 items-center justify-center rounded-xl bg-secondary/40">
          <Icon className="size-4 text-primary" />
        </span>
        <Switch
          checked={plugin.installed}
          onCheckedChange={(v) => onToggle(plugin.id, v)}
          aria-label={`Ativar ${plugin.name}`}
        />
      </div>
      <div>
        <h3 className="font-display text-sm">{plugin.name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{plugin.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between pt-2 text-[10px] tracking-widest text-muted-foreground uppercase">
        <span>{plugin.category}</span>
        <span>v{plugin.version}</span>
      </div>
    </motion.article>
  );
}