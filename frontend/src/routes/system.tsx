import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SystemCard } from "@/features/system/SystemCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useSystemStats } from "@/hooks/useSystemStats";
import { usePluginStore } from "@/store/pluginStore";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/system")({
  head: () => ({
    meta: [
      { title: "Monitoramento do sistema — BELL" },
      { name: "description", content: "Telemetria em tempo real de CPU, memória, GPU, disco e rede." },
      { property: "og:title", content: "Monitoramento do sistema — BELL" },
      { property: "og:description", content: "Telemetria em tempo real do núcleo." },
    ],
  }),
  component: SystemPage,
});

function SystemPage() {
  const { stats } = useSystemStats();
  const { isPluginEnabled } = usePluginStore();
  const isEnabled = isPluginEnabled("plg_sys");

  return (
    <AppShell>
      <div className="h-full overflow-y-auto p-8">
        <h1 className="font-display text-2xl">Sistema</h1>
        <p className="mt-1 text-sm text-muted-foreground">Telemetria do núcleo em tempo real.</p>
        <div className="mt-6">
          {!isEnabled ? (
            <EmptyState icon={Activity} title="Telemetria Desativada" description="Ative o plugin Sistema para ver a telemetria do núcleo." />
          ) : !stats ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SystemCard metric={stats.cpu} accent="var(--neon)" />
              <SystemCard metric={stats.ram} accent="var(--cyan)" />
              <SystemCard metric={stats.gpu} accent="var(--violet)" />
              <SystemCard metric={stats.temperature} accent="var(--cyan)" />

              {/* Renderiza um card por disco — usa a lista `disks`
                  se disponível, senão cai de volta no campo legado `disk` */}
              {stats.disks && stats.disks.length > 0 ? (
                stats.disks.map((diskMetric) => (
                  <SystemCard key={diskMetric.label} metric={diskMetric} accent="var(--neon)" />
                ))
              ) : (
                <SystemCard metric={stats.disk} accent="var(--neon)" />
              )}

              <SystemCard metric={stats.network} accent="var(--violet)" />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}