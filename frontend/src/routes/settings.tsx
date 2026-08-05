import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { useUIStore } from "@/store/uiStore";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — BELL" },
      { name: "description", content: "Ajuste voz, legendas e preferências do assistente." },
      { property: "og:title", content: "Configurações — BELL" },
      { property: "og:description", content: "Ajuste voz, legendas e preferências." },
    ],
  }),
  component: SettingsPage,
});

const OPTIONS = [
  { id: "voice", label: "Respostas por voz", hint: "O assistente fala as respostas em voz alta." },
  { id: "captions", label: "Legendas ao vivo", hint: "Exibe a transcrição enquanto a IA fala." },
  { id: "telemetry", label: "Telemetria", hint: "Atualiza métricas do sistema em tempo real." },
];

function SettingsPage() {
  const settings = useUIStore((s) => s.settings);
  const toggleSetting = useUIStore((s) => s.toggleSetting);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto p-8">
        <h1 className="font-display text-2xl">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Preferências da interface e do núcleo.</p>
        <div className="mt-6 max-w-2xl space-y-3">
          {OPTIONS.map((o) => (
            <div key={o.id} className="hud-panel flex items-center justify-between gap-6 p-5">
              <div>
                <p className="text-sm font-medium">{o.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{o.hint}</p>
              </div>
              <Switch
                checked={Boolean(settings[o.id])}
                onCheckedChange={() => toggleSetting(o.id)}
                aria-label={o.label}
              />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}