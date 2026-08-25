import { useEffect, useRef, useCallback } from "react";
import { useWakeWordStore } from "@/store/wakeWordStore";
import { useAssistantStore } from "@/store/assistantStore";
import { useChatStore } from "@/store/chatStore";

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Configura bipe duplo suave de confirmação
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.1); // B, then C6
    
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch (err) {
    console.error("AudioContext não suportado para beep", err);
  }
}

export function useContinuousListening(onCommandFinalized: (command: string) => void) {
  const { enabled, isAwake, isManualMicActive, isSpeaking, setAwake } = useWakeWordStore();
  const setStatus = useAssistantStore((s) => s.setStatus);
  
  const recRef = useRef<any>(null);
  const silenceTimeout = useRef<any>(null);
  const restartTimeoutRef = useRef<any>(null);
  const commandRef = useRef("");
  const restartCountRef = useRef(0);
  const lastRestartTimeRef = useRef(0);
  const consecutiveAutoTriggersRef = useRef(0);
  const lastListenStartTimeRef = useRef(Date.now());
  const firstResultTimeRef = useRef(0);

  useEffect(() => {
    if (!isSpeaking) {
      lastListenStartTimeRef.current = Date.now();
    }
  }, [isSpeaking]);

  // Ref exposta para parada imediata e síncrona pelo TTS (evita race condition de timing)
  const stopMicRef = useRef<() => void>(() => {
    if (recRef.current) {
      try { recRef.current.stop(); } catch(e) {}
      recRef.current = null;
    }
    commandRef.current = ""; // descarta transcrições acumuladas
    console.log("[WakeWord DEBUG] Mic parado imediatamente (chamada síncrona do TTS)");
  });

  // Use useCallback to ensure we invoke the *current* onCommandFinalized from ChatPanel
  const callbackRef = useRef(onCommandFinalized);
  useEffect(() => {
    callbackRef.current = onCommandFinalized;
  }, [onCommandFinalized]);

  useEffect(() => {
    let isStopping = false;
    let isRunning = false;
    let lastRestartWasNoSpeech = false; // flag para não penalizar no-speech no contador

    // Se o usuário desligou a orelhinha, OU clicou no botão de microfone manual, OU o TTS está falando
    if (!enabled || isManualMicActive || isSpeaking) {
      isStopping = true;
      if (recRef.current) {
        try { recRef.current.stop(); } catch(e) {}
        recRef.current = null;
      }
      if (isSpeaking) {
        console.log("[WakeWord DEBUG] Pausando escuta - TTS está falando (recognition parado)");
        commandRef.current = ""; // Descarta qualquer transcrição acumulada antes do TTS
        // Reseta o contador anti-loop — após TTS é normal ter vários restarts (no-speech)
        restartCountRef.current = 0;
      }
      setAwake(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API não suportada neste navegador.");
      useWakeWordStore.getState().toggleEnabled(); // Desativa se não suporta
      return;
    }

    isStopping = false;
    isRunning = false;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "pt-BR";

    const startRecognition = (recInstance: any) => {
      if (isRunning || isStopping) return;
      try {
        recInstance.start();
        isRunning = true;
      } catch(e: any) {
        console.error("[WakeWord DEBUG] Erro ao tentar religar a instância:", e.message);
      }
    };

    rec.onresult = (event: any) => {
      const currentAssistantStatus = useAssistantStore.getState().status;
      const isCurrentlySpeaking = useWakeWordStore.getState().isSpeaking;
      if (currentAssistantStatus === "speaking" || isCurrentlySpeaking) return;

      // Filtro Temporal: descarte rígido de qualquer áudio nos primeiros 500ms
      // após o microfone ser liberado, liquidando completamente os ecos de buffer do OS
      const timeSinceSilenceAllowed = Date.now() - lastListenStartTimeRef.current;
      if (timeSinceSilenceAllowed < 500) {
         console.log(`[WakeWord DEBUG] Áudio bloqueado pelo filtro temporal de hardware (${timeSinceSilenceAllowed}ms).`);
         return;
      }

      // Reseta o contador anti-loop pois o mic capturou áudio com sucesso
      restartCountRef.current = 0;

      let sessionText = "";
      for (let i = 0; i < event.results.length; ++i) {
        sessionText += event.results[i][0].transcript;
      }
      
      if (commandRef.current === "") {
        firstResultTimeRef.current = Date.now();
      }
      
      console.log("[WakeWord DEBUG] Transcrição Bruta Recebida:", sessionText);
      
      // Normalização: remove pontuações, transforma em minúsculas e remove acentos
      const normalizedText = sessionText
         .toLowerCase()
         .normalize("NFD")
         .replace(/[\u0300-\u036f]/g, "")
         .replace(/[,\.!?]/g, "");

      const regex = /\b(oi[\s]*bell?|oh[\s]*bell?|bell?)\b/gi;
      let lastMatch = false;
      let match;
      while ((match = regex.exec(normalizedText)) !== null) {
          lastMatch = true;
      }

      const awakeState = useWakeWordStore.getState().isAwake;
      commandRef.current = sessionText.trim();
      
      console.log("[WakeWord DEBUG] Estado atual - Acordado?", awakeState, "| Teve Match?", lastMatch);

      if (lastMatch && !awakeState) {
          console.log("[WakeWord DEBUG] WAKE WORD DETECTADA na fala! Acordando o assistente...");
          setAwake(true);
          setStatus("listening");
          beep();
      }

      console.log("[WakeWord DEBUG] Acumulando comando:", commandRef.current);
      resetTimeout();
    };

    const _originalResetTimeout = () => {
      // substituído logicamente pela refatoração abaixo
    }
    
    // Usando setTimeout dinâmicos requer declararmos o resetTimeout corretamente:
    const resetTimeout = () => {
      if (silenceTimeout.current) clearTimeout(silenceTimeout.current);
      console.log("[WakeWord DEBUG] Timer de 3.0s iniciado (aguardando silêncio ou mais fala)...");
      silenceTimeout.current = setTimeout(() => {
         const text = commandRef.current;
         const currentState = useWakeWordStore.getState();
         
         console.log("[WakeWord DEBUG] Timer finalizado! Texto contido:", text);
         
         if (currentState.isAwake && text.length > 0) {
            
            // ECHO DETECTION
            const messages = useChatStore.getState().messages;
            const lastAssistantMsg = messages.slice().reverse().find(m => m.role === "assistant");
            if (lastAssistantMsg) {
                const aiText = lastAssistantMsg.content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[,\.!?]/g, "");
                const userText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[,\.!?]/g, "");
                
                if (userText.length > 5) {
                   const userWords = userText.split(/\s+/);
                   const aiWords = aiText.split(/\s+/);
                   const commonWords = userWords.filter(w => aiWords.includes(w) && w.length > 2);
                   const ratio = commonWords.length / userWords.length;
                   
                   if (ratio > 0.5 || aiText.includes(userText)) {
                       console.log("[WakeWord DEBUG] Comando descartado — parece ser eco da própria fala da Bell, não fala do usuário real.");
                       setAwake(false);
                       setStatus("idle");
                       commandRef.current = "";
                       return;
                   }
                }
            }

            // LOOP PREVENTION
            const timeSinceListenStarted = firstResultTimeRef.current - lastListenStartTimeRef.current;
            if (timeSinceListenStarted < 1500) {
                consecutiveAutoTriggersRef.current += 1;
                console.log("[WakeWord DEBUG] Disparo rápido detectado. Contagem:", consecutiveAutoTriggersRef.current);
            } else {
                consecutiveAutoTriggersRef.current = 0;
            }

            if (consecutiveAutoTriggersRef.current >= 3) {
                console.error("[WakeWord DEBUG] Proteção Anti-Loop Ativada! Mais de 2 envios automáticos seguidos sem pausa do usuário. Desativando escuta.");
                useWakeWordStore.getState().toggleEnabled();
                setAwake(false);
                setStatus("idle");
                commandRef.current = "";
                return;
            }

            console.log("[WakeWord DEBUG] Enviando comando finalizado:", text);
            setAwake(false);
            setStatus("idle");
            commandRef.current = "";
            callbackRef.current(text); // Envia o comando
         } else if (currentState.isAwake) {
            console.log("[WakeWord DEBUG] Dormindo sem enviar comando. Motivo: vazio (demorou demais ou só disse a wake word).");
            // Acordou mas não disse nada após 3.0s
            setAwake(false);
            setStatus("idle");
            commandRef.current = "";
         }
      }, 4000); 
    };

    rec.onerror = (e: any) => {
      if (e.error === "aborted" || e.error === "no-speech") {
         // no-speech é comportamento normal — marca para NÃO incrementar o contador no onend
         lastRestartWasNoSpeech = true;
         return; // Nao polui o console com esse erro normal
      }
      
      console.warn(`[WakeWord DEBUG] onerror disparado! Origem do erro: '${e.error}'`, e);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
         console.warn("[WakeWord DEBUG] Permissão de microfone negada. Desativando.");
         const state = useWakeWordStore.getState();
         if (state.enabled) {
             state.toggleEnabled();
         }
      } else {
         console.warn("[WakeWord DEBUG] Erro na captura mapeado:", e.error);
      }
    };

    rec.onend = () => {
       console.log("[WakeWord DEBUG] Seção contínua API atingiu o fim nativo (onend).");
       isRunning = false;
       
       const currentStoreState = useWakeWordStore.getState();

       // Não reinicia se o TTS ainda estiver ativo
       if (currentStoreState.isSpeaking) {
          console.log("[WakeWord DEBUG] onend ignorado — TTS ainda está falando. Aguardando isSpeaking=false para retomar.");
          return;
       }

        // Reinicia automaticamente (a menos que tenha sido explicitamente desativado)
       if (currentStoreState.enabled && !isStopping) {
          
          // no-speech é comportamento normal — NÃO incrementa o contador anti-loop
          if (!lastRestartWasNoSpeech) {
            const now = Date.now();
            if (now - lastRestartTimeRef.current > 3000) {
                restartCountRef.current = 0;
            }
            restartCountRef.current += 1;
            lastRestartTimeRef.current = now;

            if (restartCountRef.current > 5) {
               console.error("[WakeWord DEBUG] Falha de segurança! Loop infinito detectado (>5 falhas reais em <3s). Desativando.");
               currentStoreState.toggleEnabled();
               return;
            }
          }
          lastRestartWasNoSpeech = false; // Reset flag

          // Usa delay menor após TTS para minimizar a zona morta
          const delay = 500;
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
              if (useWakeWordStore.getState().isSpeaking) {
                 console.log("[WakeWord DEBUG] Reinício cancelado — TTS iniciou durante o delay.");
                 return;
              }
              if (useWakeWordStore.getState().enabled && !isStopping && !isRunning) {
                  try {
                     recRef.current = new SpeechRecognition();
                     recRef.current.continuous = true;
                     recRef.current.interimResults = true;
                     recRef.current.lang = "pt-BR";
                     recRef.current.onresult = rec.onresult;
                     recRef.current.onerror = rec.onerror;
                     recRef.current.onend = rec.onend;
                     startRecognition(recRef.current);
                  } catch(e) {}
              }
          }, delay);
       } else {
          console.log("[WakeWord DEBUG] Módulo de escuta paralisado ou desabilitado via manual.");
       }
    };

    recRef.current = rec;
    startRecognition(rec);

    return () => {
      isStopping = true;
      if (silenceTimeout.current) clearTimeout(silenceTimeout.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (recRef.current) {
        try { recRef.current.stop(); } catch(e) {}
        recRef.current = null;
      }
    };
  }, [enabled, isManualMicActive, isSpeaking, setAwake, setStatus]);

  return { isAwake, stopMicRef };
}
