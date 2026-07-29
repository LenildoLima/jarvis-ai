import { Link, useRouterState } from "@tanstack/react-router";
import { Brain, Cpu, Info, LayoutDashboard, Puzzle, Settings, Sparkles } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/config/env";
import { useAssistantStore } from "@/store/assistantStore";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Núcleo", icon: LayoutDashboard },
  { to: "/memory", label: "Memória", icon: Brain },
  { to: "/plugins", label: "Plugins", icon: Puzzle },
  { to: "/system", label: "Sistema", icon: Cpu },
  { to: "/settings", label: "Configurações", icon: Settings },
  { to: "/about", label: "Sobre", icon: Info },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const connection = useAssistantStore((s) => s.connection);

  return (
    <aside className="flex w-[76px] shrink-0 flex-col items-center gap-6 border-r border-border/60 bg-sidebar/50 py-5 backdrop-blur-md">
      <Link to="/" className="group flex flex-col items-center gap-1" aria-label={APP_NAME}>
        <span className="ring-glow flex size-10 items-center justify-center rounded-xl bg-secondary/40 transition-transform group-hover:scale-105">
          <Sparkles className="size-4 text-primary" />
        </span>
        <span className="font-display text-[10px] tracking-[0.3em] text-muted-foreground">{APP_NAME}</span>
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-2">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              title={label}
              aria-label={label}
              className={cn(
                "relative flex size-11 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-all",
                "hover:border-border hover:bg-secondary/40 hover:text-foreground",
                active && "border-primary/40 bg-primary/10 text-primary ring-glow",
              )}
            >
              <Icon className="size-[18px]" />
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1.5">
        <span
          className={cn(
            "size-2 rounded-full",
            connection === "connected" && "bg-cyan shadow-glow",
            connection === "reconnecting" && "animate-pulse bg-violet",
            connection === "offline" && "bg-destructive",
          )}
        />
        <span className="text-[9px] tracking-widest text-muted-foreground">v{APP_VERSION}</span>
      </div>
    </aside>
  );
}