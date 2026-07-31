import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Paperclip, SendHorizonal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceButton } from "@/features/voice/VoiceButton";
import { useChatStore } from "@/store/chatStore";
import { useAssistantStore } from "@/store/assistantStore";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { SUGGESTION_CHIPS } from "@/config/env";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ChatPanel() {
  const [draft, setDraft] = useState("");
  const messages = useChatStore((s) => s.messages);
  const thinking = useChatStore((s) => s.thinking);
  const loadingMessages = useChatStore((s) => s.loadingMessages);
  const send = useChatStore((s) => s.send);
  const socketStatus = useChatStore((s) => s.socketStatus);
  const setStatus = useAssistantStore((s) => s.setStatus);
  const setAmplitude = useAssistantStore((s) => s.setAmplitude);
  const setCaption = useAssistantStore((s) => s.setCaption);
  const { speak, caption, speaking } = useTextToSpeech();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

  useEffect(() => {
    setCaption(caption);
  }, [caption, setCaption]);

  useEffect(() => {
    if (!speaking) return;
    const id = setInterval(() => setAmplitude(0.3 + Math.random() * 0.7), 140);
    return () => clearInterval(id);
  }, [speaking, setAmplitude]);

  async function submit(text: string) {
    const content = text.trim();
    if (!content) return;
    setDraft("");
    setStatus("processing");
    const reply = await send(content);
    inputRef.current?.focus();
    if (reply) {
      setStatus("speaking");
      await speak(reply.content);
    }
    setStatus("idle");
  }

  const isConnected = socketStatus === "connected";
  const isConnecting = socketStatus === "connecting";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {loadingMessages ? (
          <LoadingSkeleton rows={3} />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[76%] rounded-2xl border px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "border-primary/30 bg-primary/12 text-foreground"
                      : "border-border/60 bg-secondary/30 text-foreground/90",
                  )}
                >
                  {m.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {thinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 pl-1">
            <Sparkles className="size-3.5 text-cyan" />
            <span className="text-xs text-muted-foreground">A IA está pensando</span>
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="size-1.5 rounded-full bg-cyan"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </span>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {caption && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-6 mb-2 rounded-lg border border-cyan/25 bg-cyan/5 px-4 py-2 text-center text-xs text-cyan"
            aria-live="polite"
          >
            {caption}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border-t border-border/60 bg-background/50 px-6 py-4 backdrop-blur-md">
        <div className="hud-panel flex items-end gap-2 p-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 rounded-full text-muted-foreground"
            aria-label="Anexar arquivo"
            onClick={() => toast("Anexos chegam com a integração do backend.")}
          >
            <Paperclip className="size-4" />
          </Button>

          <Textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(draft);
              }
            }}
            rows={1}
            disabled={thinking}
            placeholder={
              isConnected
                ? "Fale ou digite um comando..."
                : isConnecting
                ? "Conectando ao núcleo de IA..."
                : "Desconectado. Reconectando automaticamente..."
            }
            className="max-h-32 min-h-10 resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
          />

          <VoiceButton onTranscript={(text) => void submit(text)} />

          <Button
            size="icon"
            className="size-10 shrink-0 rounded-full"
            aria-label="Enviar mensagem"
            disabled={!draft.trim() || thinking}
            onClick={() => void submit(draft)}
          >
            <SendHorizonal className="size-4" />
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => void submit(chip)}
              disabled={thinking}
              className="rounded-full border border-border/60 bg-secondary/30 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}