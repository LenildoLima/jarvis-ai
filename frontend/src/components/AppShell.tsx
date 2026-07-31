import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { MetricsBar } from "@/components/MetricsBar";
import { CommandPalette } from "@/components/CommandPalette";
import { OfflineOverlay } from "@/components/OfflineOverlay";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";

export function AppShell({ children }: { children: ReactNode }) {
  useRealtimeConnection();

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
      <OfflineOverlay />
    </div>
  );
}