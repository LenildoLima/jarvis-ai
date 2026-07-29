import { AnimatePresence, motion } from "motion/react";
import { RefreshCw, WifiOff } from "lucide-react";
import { useAssistantStore } from "@/store/assistantStore";
import { Button } from "@/components/ui/button";

export function OfflineOverlay() {
  const connection = useAssistantStore((s) => s.connection);
  const setConnection = useAssistantStore((s) => s.setConnection);
  const visible = connection !== "connected";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.96, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="hud-panel ring-glow flex w-[360px] flex-col items-center gap-4 p-8 text-center"
          >
            <span className="relative flex size-14 items-center justify-center rounded-full bg-destructive/10">
              <WifiOff className="size-6 text-destructive" />
              <motion.span
                className="absolute inset-0 rounded-full border border-destructive/40"
                animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </span>
            <div>
              <h2 className="font-display text-lg">
                {connection === "reconnecting" ? "Reconectando..." : "Conexão perdida"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                O canal em tempo real com o núcleo está indisponível. A interface continua
                operando em modo local.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setConnection("reconnecting");
                setTimeout(() => setConnection("connected"), 1600);
              }}
            >
              <RefreshCw className="size-3.5" /> Tentar novamente
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}