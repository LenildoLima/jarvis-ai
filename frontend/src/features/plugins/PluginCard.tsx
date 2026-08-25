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
  CheckCircle2,
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
  spotifyConnected,
  onSpotifyConnect,
  onSpotifyDisconnect,
}: {
  plugin: Plugin;
  index?: number;
  onToggle: (id: string, installed: boolean) => void;
  /** Only relevant when plugin.id === "plg_spo" */
  spotifyConnected?: boolean;
  onSpotifyConnect?: () => void;
  onSpotifyDisconnect?: () => void;
}) {
  const Icon = ICONS[plugin.icon] ?? Puzzle;
  const isSpotify = plugin.id === "plg_spo";

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

      {/* Spotify OAuth section */}
      {isSpotify && (
        <div className="border-t border-border/40 pt-3">
          {spotifyConnected ? (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                Conectado
              </span>
              <button
                onClick={onSpotifyDisconnect}
                className="text-[11px] tracking-wide text-muted-foreground transition-colors hover:text-destructive"
              >
                Desconectar
              </button>
            </div>
          ) : (
            <button
              onClick={onSpotifyConnect}
              className="w-full rounded-lg bg-[#1DB954]/10 px-3 py-1.5 text-[11px] font-semibold tracking-wider text-[#1DB954] ring-1 ring-[#1DB954]/30 transition-all hover:bg-[#1DB954]/20 hover:ring-[#1DB954]/60"
            >
              Conectar Spotify
            </button>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-2 text-[10px] tracking-widest text-muted-foreground uppercase">
        <span>{plugin.category}</span>
        <span>v{plugin.version}</span>
      </div>
    </motion.article>
  );
}