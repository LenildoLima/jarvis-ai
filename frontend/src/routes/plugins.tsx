import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Puzzle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PluginCard } from "@/features/plugins/PluginCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { usePluginStore } from "@/store/pluginStore";
import type { Plugin } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import * as spotifyService from "@/services/spotifyService";

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
  const { plugins: items, initialized, loadPlugins, togglePlugin } = usePluginStore();
  const loading = !initialized;
  const accessToken = useAuthStore((s) => s.accessToken);

  const [spotifyConnected, setSpotifyConnected] = useState(false);

  // Detect OAuth callback params and clean URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const spotifyParam = params.get("spotify");

    if (spotifyParam === "connected") {
      toast.success("Spotify conectado com sucesso!");
      setSpotifyConnected(true);
      params.delete("spotify");
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
      history.replaceState(null, "", newUrl);
    } else if (spotifyParam === "error") {
      toast.error("Falha ao conectar o Spotify. Tente novamente.");
      params.delete("spotify");
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
      history.replaceState(null, "", newUrl);
    }
  }, []);

  // Load plugins
  useEffect(() => {
    if (!initialized && accessToken) {
      void loadPlugins(accessToken).catch(err => {
        console.error("Failed to load plugins:", err);
        toast.error("Falha ao carregar plugins");
      });
    }
  }, [initialized, accessToken, loadPlugins]);

  // Load Spotify connection status
  useEffect(() => {
    if (!accessToken) return;
    spotifyService.getStatus(accessToken)
      .then(setSpotifyConnected)
      .catch((err) => console.error("Failed to load Spotify status:", err));
  }, [accessToken]);

  const handleSpotifyConnect = () => {
    if (!accessToken) return;
    spotifyService.getLoginUrl(accessToken)
      .then((url) => { window.location.href = url; })
      .catch(() => toast.error("Não foi possível iniciar a conexão com o Spotify."));
  };

  const handleSpotifyDisconnect = () => {
    if (!accessToken) return;
    spotifyService.disconnect(accessToken)
      .then(() => {
        setSpotifyConnected(false);
        toast.success("Spotify desconectado.");
      })
      .catch(() => toast.error("Não foi possível desconectar o Spotify."));
  };

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
                  onToggle={(id, installed) => {
                    togglePlugin(accessToken, id, installed).catch((err) => {
                      console.error("Failed to toggle plugin", err);
                      toast.error("Falha ao atualizar o plugin");
                    });
                  }}
                  {...(p.id === "plg_spo" ? {
                    spotifyConnected,
                    onSpotifyConnect: handleSpotifyConnect,
                    onSpotifyDisconnect: handleSpotifyDisconnect,
                  } : {})}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}