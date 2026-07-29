import { motion } from "motion/react";
import { Mic, Square } from "lucide-react";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useAssistantStore } from "@/store/assistantStore";
import { cn } from "@/lib/utils";

export function VoiceButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const setStatus = useAssistantStore((s) => s.setStatus);
  const status = useAssistantStore((s) => s.status);

  const { listening, start, stop } = useVoiceRecognition((text) => {
    setStatus("processing");
    onTranscript(text);
  });

  const active = listening || status === "listening";

  return (
    <button
      type="button"
      aria-label={active ? "Parar escuta" : "Falar com o assistente"}
      onClick={() => {
        if (active) {
          stop();
          setStatus("idle");
        } else {
          start();
          setStatus("listening");
        }
      }}
      className={cn(
        "relative flex size-10 items-center justify-center rounded-full border border-border/70 bg-secondary/40 text-muted-foreground transition-colors",
        "hover:border-primary/50 hover:text-primary",
        active && "border-cyan/60 bg-cyan/10 text-cyan",
      )}
    >
      {active && (
        <motion.span
          className="absolute inset-0 rounded-full border border-cyan/50"
          animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      {active ? <Square className="size-3.5" /> : <Mic className="size-4" />}
    </button>
  );
}