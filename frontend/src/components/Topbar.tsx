import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CloudMoon, Command, Settings, UserRound } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationCard } from "@/components/NotificationCard";
import { EmptyState } from "@/components/EmptyState";
import { useUIStore } from "@/store/uiStore";
import { mockUser } from "@/mock/data";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Topbar() {
  const now = useClock();
  const notifications = useUIStore((s) => s.notifications);
  const dismiss = useUIStore((s) => s.dismissNotification);
  const toggleCommand = useUIStore((s) => s.toggleCommand);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-background/40 px-6 backdrop-blur-md">
      <div className="flex items-baseline gap-4">
        <span className="font-display text-2xl tabular-nums text-glow">
          {now ? now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
        </span>
        <span className="text-xs tracking-widest text-muted-foreground uppercase">
          {now
            ? now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
            : "carregando"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="hud-panel hidden items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground md:flex">
          <CloudMoon className="size-4 text-cyan" />
          <span>19°C · Céu limpo</span>
        </div>

        <button
          onClick={toggleCommand}
          className="hud-panel flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Command className="size-3.5" />
          <span className="hidden sm:inline">Comandos</span>
          <kbd className="rounded border border-border px-1 text-[10px]">⌘K</kbd>
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button
              className="hud-panel relative flex size-9 items-center justify-center transition-colors hover:text-primary"
              aria-label="Notificações"
            >
              <Bell className="size-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-cyan shadow-glow" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-2 border-border/70 bg-popover/95 backdrop-blur-xl">
            {notifications.length === 0 ? (
              <EmptyState icon={Bell} title="Sem notificações" description="Tudo tranquilo por aqui." />
            ) : (
              notifications.map((n) => (
                <NotificationCard key={n.id} notification={n} onDismiss={dismiss} />
              ))
            )}
          </PopoverContent>
        </Popover>

        <Link
          to="/settings"
          className="hud-panel flex size-9 items-center justify-center transition-colors hover:text-primary"
          aria-label="Configurações"
        >
          <Settings className="size-4" />
        </Link>

        <Link
          to="/auth"
          className="hud-panel flex items-center gap-2 px-2.5 py-1.5 transition-colors hover:text-primary"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/15">
            <UserRound className="size-3.5 text-primary" />
          </span>
          <span className="hidden text-xs sm:inline">{mockUser.name}</span>
        </Link>
      </div>
    </header>
  );
}