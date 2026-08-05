import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Brain } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MemoryCard } from "@/features/memory/MemoryCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useMemoryData } from "@/hooks/useMemoryData";

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Memória neural — BELL" },
      { name: "description", content: "Lembranças, preferências e conhecimento aprendidos pelo assistente." },
      { property: "og:title", content: "Memória neural — BELL" },
      { property: "og:description", content: "Lembranças e preferências aprendidas pelo assistente." },
    ],
  }),
  component: MemoryPage,
});

function MemoryPage() {
  const { items, loading, load } = useMemoryData();
  useEffect(() => void load(), [load]);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto p-8">
        <h1 className="font-display text-2xl">Memória neural</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tudo que o assistente aprendeu sobre você, com nível de confiança.
        </p>
        <div className="mt-6">
          {loading ? (
            <LoadingSkeleton rows={6} />
          ) : items.length === 0 ? (
            <EmptyState icon={Brain} title="Sem memórias" description="Converse com o assistente para começar." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((m, i) => (
                <MemoryCard key={m.id} memory={m} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}