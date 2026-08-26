import { useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "motion/react";

import { Paperclip, SendHorizonal, Sparkles, Volume2, VolumeX, X, Sun } from "lucide-react";

import ReactMarkdown from "react-markdown";

import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";

import { VoiceButton } from "@/features/voice/VoiceButton";

import { useChatStore } from "@/store/chatStore";

import { useAssistantStore } from "@/store/assistantStore";

import { useTextToSpeech } from "@/hooks/useTextToSpeech";

import { useContinuousListening } from "@/hooks/useContinuousListening";

import { LoadingSkeleton } from "@/components/LoadingSkeleton";

import { SUGGESTION_CHIPS } from "@/config/env";

import { cn } from "@/lib/utils";

import { toast } from "sonner";



export function ChatPanel() {

  const [draft, setDraft] = useState("");

  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string; base64: string } | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const messages = useChatStore((s) => s.messages);

  const thinking = useChatStore((s) => s.thinking);

  const loadingMessages = useChatStore((s) => s.loadingMessages);

  const send = useChatStore((s) => s.send);

  const socketStatus = useChatStore((s) => s.socketStatus);

  const setStatus = useAssistantStore((s) => s.setStatus);

  const setAmplitude = useAssistantStore((s) => s.setAmplitude);

  const setCaption = useAssistantStore((s) => s.setCaption);

  const isSubmittingRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const dropZoneRef = useRef<HTMLDivElement>(null);

  // useContinuousListening direto aqui para ter acesso ao stopMicRef e passá-lo ao TTS

  const { stopMicRef } = useContinuousListening((text: string) => void submit(text));

  const { speak, caption, speaking, cancel } = useTextToSpeech(stopMicRef);

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

    if (!speaking) {

      setSpeakingMessageId(null);
      setStatus("idle"); // Garante que o status seja resetado quando TTS termina

    }

  }, [speaking, setStatus]);



  useEffect(() => {

    if (!speaking) return;

    const id = setInterval(() => setAmplitude(0.3 + Math.random() * 0.7), 140);

    return () => clearInterval(id);

  }, [speaking, setAmplitude]);

  // Safety net: reset isSubmittingRef se estiver travado por mais de 30s
  useEffect(() => {
    const safetyCheck = setInterval(() => {
      if (isSubmittingRef.current && !thinking && !speaking) {
        console.log("[ChatPanel] Safety net: Resetando isSubmittingRef travado");
        isSubmittingRef.current = false;
      }
    }, 30000);
    return () => clearInterval(safetyCheck);
  }, [thinking, speaking]);

  // Resumo Matinal - Gatilho automático único diário
  useEffect(() => {
    if (socketStatus === "connected" && !thinking && !loadingMessages && !isSubmittingRef.current) {
      const today = new Date().toLocaleDateString();
      const lastBriefing = localStorage.getItem("jarvis_last_briefing");
      if (lastBriefing !== today) {
        // Delay suave para não conflitar com a montagem
        setTimeout(() => {
          // Checamos novamente o socket e se não está enviando nada
          if (!isSubmittingRef.current && useChatStore.getState().socketStatus === "connected") {
            localStorage.setItem("jarvis_last_briefing", today);
            void submit("[SISTEMA: GERAR_RESUMO_MATINAL]");
          }
        }, 1500);
      }
    }
  }, [socketStatus, thinking, loadingMessages]);

  // Conexão proativa do WebSocket ao inicializar o componente
  useEffect(() => {
    if (socketStatus === "disconnected") {
      void useChatStore.getState().connectWS();
    }
  }, [socketStatus]);

  // Função para converter arquivo para base64 com validação
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Validar tamanho (5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        reject(new Error("O arquivo excede o limite de 5MB"));
        return;
      }

      // Validar tipo
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        reject(new Error("Tipo de arquivo não suportado. Use JPEG, PNG ou WebP"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remover prefixo data:image/...;base64,
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Erro ao ler o arquivo"));
      reader.readAsDataURL(file);
    });
  };

  // Handler para seleção de arquivo
  const handleFileSelect = (file: File) => {
    convertFileToBase64(file)
      .then((base64) => {
        const preview = URL.createObjectURL(file);
        setSelectedImage({ file, preview, base64 });
      })
      .catch((error) => {
        toast.error(error.message);
      });
  };

  // Handler para clique no botão de anexar
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  // Handler para change do input file
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input para permitir selecionar o mesmo arquivo novamente
    e.target.value = "";
  };

  // Handler para remover imagem selecionada
  const handleRemoveImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.preview);
    }
    setSelectedImage(null);
  };

  // Handlers para drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handler para paste de imagem do clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleFileSelect(file);
        }
        break;
      }
    }
  };



  async function submit(text: string) {

    const content = text.trim();

    if (!content && !selectedImage) return;

    // Guard contra chamadas concorrentes (evita que loop de feedback trave o estado thinking)

    if (isSubmittingRef.current) {

      console.log("[ChatPanel] submit ignorado — já existe uma requisição em andamento.");

      return;

    }

    isSubmittingRef.current = true;

    const imageBase64 = selectedImage?.base64 || null;

    console.log("[ChatPanel] Enviando mensagem - imageBase64 presente:", !!imageBase64, "tamanho:", imageBase64?.length || 0);

    setDraft("");

    setSelectedImage(null);

    setStatus("processing");

    try {

      const reply = await send(content, imageBase64);

      inputRef.current?.focus();

      if (reply) {

        setStatus("speaking");

        setSpeakingMessageId(reply.id);

        await speak(reply.content);

      }

    } finally {

      isSubmittingRef.current = false;

      setStatus("idle");

    }

  }



  async function handleSpeakMessage(messageId: string, content: string) {

    if (speaking && speakingMessageId === messageId) {

      // Já está falando esta mensagem - parar
      setStatus("idle");
      cancel();

    } else {

      // Iniciar fala desta mensagem
      setStatus("speaking");

      setSpeakingMessageId(messageId);

      await speak(content);

    }

  }



  const isConnected = socketStatus === "connected";

  const isConnecting = socketStatus === "connecting";



  return (

    <div className="flex h-full min-h-0 flex-col">

      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4 transition-colors",
          isDragging && "bg-cyan/5"
        )}
      >

        {loadingMessages ? (

          <LoadingSkeleton rows={3} />

        ) : (

          <AnimatePresence initial={false}>

            {messages.filter(m => !m.content.startsWith("[SISTEMA:")).map((m) => (
              <motion.div

                key={m.id}

                initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}

                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}

                transition={{ duration: 0.32, ease: "easeOut" }}

                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}

              >

                <div

                  className={cn(

                    "relative max-w-[76%] rounded-2xl border px-4 py-2.5 text-sm leading-relaxed",

                    m.role === "user"

                      ? "border-primary/30 bg-primary/12 text-foreground"

                      : "border-border/60 bg-secondary/30 text-foreground/90",

                  )}

                >
                  {m.role === "user" && m.imageBase64 && (
                    <div className="mb-2 overflow-hidden rounded-lg">
                      <img
                        src={`data:image/jpeg;base64,${m.imageBase64}`}
                        alt="Imagem enviada"
                        className="max-h-48 w-auto object-contain"
                      />
                    </div>
                  )}
                  {m.role === "assistant" && (
                    <button
                      onClick={() => handleSpeakMessage(m.id, m.content)}
                      className={cn(
                        "absolute -top-3 -right-3 z-50 flex size-5 items-center justify-center rounded-full shadow-lg transition-colors border-2 border-background",
                        speaking && speakingMessageId === m.id
                          ? "bg-cyan text-white hover:bg-cyan/80"
                          : "bg-muted-foreground/80 text-white hover:bg-muted-foreground"
                      )}
                      aria-label={speaking && speakingMessageId === m.id ? "Parar fala" : "Ouvir mensagem"}
                    >
                      {speaking && speakingMessageId === m.id ? (
                        <VolumeX className="size-3" />
                      ) : (
                        <Volume2 className="size-3" />
                      )}
                    </button>
                  )}
                  {m.role === "assistant" ? (

                    <ReactMarkdown

                      remarkPlugins={[remarkGfm]}

                      components={{

                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

                        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,

                        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,

                        li: ({ children }) => <li>{children}</li>,

                        code: ({ node, inline, children, ...props }: any) =>

                          inline ? (

                            <code className="rounded bg-primary/20 px-1 py-0.5 text-xs font-mono" {...props}>{children}</code>

                          ) : (

                            <code className="block rounded bg-primary/10 p-2 text-xs font-mono" {...props}>{children}</code>

                          ),

                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,

                      }}

                    >

                      {m.content}

                    </ReactMarkdown>

                  ) : (

                    m.content

                  )}

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







      <div className="border-t border-border/60 bg-background/50 px-6 py-4 backdrop-blur-md">

        <div className="hud-panel flex items-end gap-2 p-2">
          
          <Button
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 rounded-full text-muted-foreground hover:text-amber-400"
            aria-label="Gerar Resumo Matinal Automático"
            onClick={() => void submit("[SISTEMA: GERAR_RESUMO_MATINAL]")}
            disabled={thinking}
          >
            <Sun className="size-4" />
          </Button>

          <Button

            variant="ghost"

            size="icon"

            className="size-10 shrink-0 rounded-full text-muted-foreground"

            aria-label="Anexar arquivo"

            onClick={handleAttachClick}

          >

            <Paperclip className="size-4" />

          </Button>

          <input

            ref={fileInputRef}

            type="file"

            accept="image/jpeg,image/png,image/webp"

            onChange={handleFileInputChange}

            className="hidden"

          />

          {selectedImage && (
            <div className="relative mb-2 flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 p-2">
              <img
                src={selectedImage.preview}
                alt="Preview"
                className="h-12 w-12 rounded object-cover"
              />
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {selectedImage.file.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 rounded-full"
                onClick={handleRemoveImage}
              >
                <X className="size-3" />
              </Button>
            </div>
          )}

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

            onPaste={handlePaste}

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

            disabled={(!draft.trim() && !selectedImage) || thinking}

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