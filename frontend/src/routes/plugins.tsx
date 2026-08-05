import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Puzzle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PluginCard } from "@/features/plugins/PluginCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { pluginService } from "@/services/pluginService";
import type { Plugin } from "@/types";

export const Route = createFileRoute("/plugins")({
  head: () => ({
    meta: [
      { title: "Plugins e integrações — BELL" },
      { name: "description", content: "Ative módulos e integrações para expandir o assistente." },
      { property: "og:title", content: "Plugins e integrações — BELL" },
      { property: "og:description", content: "Ative módulos e integrações do assistente." },
    ],
  }),
  component: PluginsPage,
});

function PluginsPage() {
  const [items, setItems] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void pluginService.list().then((p) => {
      setItems(p);
      setLoading(false);
    });
  }, []);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto p-8">
        <h1 className="font-display text-2xl">Plugins</h1>
        <p className="mt-1 text-sm text-muted-foreground">Expanda as capacidades do núcleo.</p>
        <div className="mt-6">
          {loading ? (
            <LoadingSkeleton rows={6} />
          ) : items.length === 0 ? (
            <EmptyState icon={Puzzle} title="Nenhum plugin" description="Nada disponível no momento." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((p, i) => (
                <PluginCard
                  key={p.id}
                  plugin={p}
                  index={i}
                  onToggle={(id, installed) =>
                    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, installed } : x)))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}