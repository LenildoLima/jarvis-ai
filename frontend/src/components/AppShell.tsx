import { useEffect, type ReactNode } from "react";
import { motion } from "motion/react";
import { useAuthStore } from "@/store/authStore";
import { usePluginStore } from "@/store/pluginStore";
import { useSystemStatsStore } from "@/store/systemStatsStore";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { MetricsBar } from "@/components/MetricsBar";
import { CommandPalette } from "@/components/CommandPalette";
import { OfflineOverlay } from "@/components/OfflineOverlay";
import { ReminderToast } from "@/components/ReminderToast";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { useReminderAlerts } from "@/hooks/useReminderAlerts";

export function AppShell({ children }: { children: ReactNode }) {
  useRealtimeConnection();
  useReminderAlerts();
  const token = useAuthStore((s) => s.accessToken);
  const loadPlugins = usePluginStore((s) => s.loadPlugins);

  // Reactive boolean: re-renders (and re-runs effects) whenever the plugin
  // list changes, because we subscribe directly to `plugins` array.
  const isSysEnabled = usePluginStore(
    (s) => s.initialized && s.plugins.some((p) => p.id === "plg_sys" && p.installed)
  );

  const connect = useSystemStatsStore((s) => s.connect);
  const disconnect = useSystemStatsStore((s) => s.disconnect);

  useEffect(() => {
    if (token) {
      void loadPlugins(token);
    }
  }, [token, loadPlugins]);

  // Gerencia o WebSocket único de telemetria como efeito colateral do estado
  useEffect(() => {
    if (isSysEnabled) {
      connect();
    } else {
      disconnect();
    }
  }, [isSysEnabled, connect, disconnect]);

  return (
    <div className="relative flex h-screen overflow-hidden">
      <div className="hud-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar />
        <MetricsBar />
        <motion.main
          className="min-h-0 flex-1 overflow-hidden"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {children}
        </motion.main>
      </div>
      <CommandPalette />
      <ReminderToast />
      <OfflineOverlay />
    </div>
  );
}