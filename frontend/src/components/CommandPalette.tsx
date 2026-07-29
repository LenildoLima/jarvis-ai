import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Brain, Cpu, Info, LayoutDashboard, MicVocal, Puzzle, Settings, WifiOff } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useUIStore } from "@/store/uiStore";
import { useAssistantStore } from "@/store/assistantStore";

export function CommandPalette() {
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const toggle = useUIStore((s) => s.toggleCommand);
  const setStatus = useAssistantStore((s) => s.setStatus);
  const setConnection = useAssistantStore((s) => s.setConnection);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const go = (to: string) => {
    setOpen(false);
    void navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar comandos, telas e ações..." />
      <CommandList>
        <CommandEmpty>Nenhum comando encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          <CommandItem onSelect={() => go("/")}>
            <LayoutDashboard /> Núcleo
          </CommandItem>
          <CommandItem onSelect={() => go("/memory")}>
            <Brain /> Memória
          </CommandItem>
          <CommandItem onSelect={() => go("/plugins")}>
            <Puzzle /> Plugins
          </CommandItem>
          <CommandItem onSelect={() => go("/system")}>
            <Cpu /> Sistema
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")}>
            <Settings /> Configurações
          </CommandItem>
          <CommandItem onSelect={() => go("/about")}>
            <Info /> Sobre
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Assistente">
          <CommandItem
            onSelect={() => {
              setStatus("listening");
              setOpen(false);
            }}
          >
            <MicVocal /> Ativar escuta
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setConnection("offline");
              setOpen(false);
            }}
          >
            <WifiOff /> Simular perda de conexão
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}