import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";
import { AppShell } from "@/components/AppShell";
import { Splash } from "@/components/Splash";
import { AIOrb } from "@/components/AIOrb";
import { ConversationList } from "@/features/chat/ConversationList";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { useUIStore } from "@/store/uiStore";
import { mockUser } from "@/mock/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NOVA — Núcleo do assistente de IA" },
      {
        name: "description",
        content:
          "Interface HUD futurista para um assistente pessoal de IA: núcleo neural, chat por voz e telemetria do sistema em tempo real.",
      },
      { property: "og:title", content: "NOVA — Núcleo do assistente de IA" },
      {
        property: "og:description",
        content: "Painel HUD com orb neural, chat por voz e telemetria do sistema.",
      },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 19) return "Boa tarde";
  return "Boa noite";
}

function Dashboard() {
  const booted = useUIStore((s) => s.booted);
  const setBooted = useUIStore((s) => s.setBooted);

  if (!booted) {
    return (
      <AnimatePresence>
        <Splash onDone={() => setBooted(true)} />
      </AnimatePresence>
    );
  }

  return (
    <AppShell>
      <div className="grid h-full grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="hidden min-h-0 lg:block">
          <ConversationList />
        </div>

        <section className="flex min-h-0 flex-col">
          <div className="flex flex-col items-center justify-center px-6 pt-6 pb-2">
            <AIOrb size={210} />
            <h1 className="mt-4 font-display text-xl">
              {greeting()}, {mockUser.name}.
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Bem-vindo de volta. Todos os sistemas operando normalmente.
            </p>
          </div>
          <div className="min-h-0 flex-1">
            <ChatPanel />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
