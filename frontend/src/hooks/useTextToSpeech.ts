import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// ⚙️  Configuração de voz — ajuste aqui sem tocar no resto do hook
// ---------------------------------------------------------------------------

/** Nomes parciais priorizados ao buscar voz feminina pt-BR (case-insensitive). */
const FEMALE_NAME_HINTS = ["francisca", "luciana", "maria", "vitória", "ana", "helena"];

/** Pitch (tom): 0.0–2.0, padrão do navegador = 1.0.
 *  0.85 soa levemente mais grave mas ainda feminino. */
const TTS_PITCH = 0.85;

/** Rate (velocidade): 0.1–10.0, padrão = 1.0. */
const TTS_RATE = 1.02;

// ---------------------------------------------------------------------------
// Resolução assíncrona da voz feminina pt-BR
// ---------------------------------------------------------------------------

function pickFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const ptBR = voices.filter((v) => v.lang.startsWith("pt-BR"));
  if (ptBR.length === 0) return null;

  // Prioriza nomes femininos conhecidos
  for (const hint of FEMALE_NAME_HINTS) {
    const match = ptBR.find((v) => v.name.toLowerCase().includes(hint));
    if (match) return match;
  }

  // Fallback: primeira voz pt-BR disponível
  return ptBR[0];
}

/** Retorna uma Promise que resolve com a melhor voz feminina pt-BR disponível. */
function resolveFemaleVoice(): Promise<SpeechSynthesisVoice | null> {
  return new Promise((resolve) => {
    const tryResolve = () => {
      const voice = pickFemaleVoice(window.speechSynthesis.getVoices());
      resolve(voice);
    };

    // As vozes já podem estar carregadas (Firefox, alguns Chrome)
    if (window.speechSynthesis.getVoices().length > 0) {
      tryResolve();
      return;
    }

    // Aguarda o evento assíncrono (Chrome/Edge)
    window.speechSynthesis.addEventListener("voiceschanged", tryResolve, { once: true });
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** TTS com SpeechSynthesis + legendas ao vivo; voz feminina pt-BR automática. */
export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [caption, setCaption] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Resolve a voz uma única vez ao montar o hook
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    resolveFemaleVoice().then((v) => {
      voiceRef.current = v;
    });
  }, []);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const cancel = useCallback(() => {
    clear();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setCaption("");
  }, [clear]);

  const speak = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        clear();
        setSpeaking(true);

        // Legenda palavra-a-palavra
        const words = text.split(/\s+/);
        const step = Math.max(70, Math.min(150, 4200 / Math.max(words.length, 1)));
        words.forEach((_, i) => {
          timers.current.push(
            setTimeout(() => setCaption(words.slice(0, i + 1).join(" ")), step * i),
          );
        });
        timers.current.push(
          setTimeout(
            () => {
              setSpeaking(false);
              setCaption("");
              resolve();
            },
            step * words.length + 500,
          ),
        );

        // Síntese de voz
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = "pt-BR";
          utterance.pitch = TTS_PITCH;
          utterance.rate = TTS_RATE;
          if (voiceRef.current) {
            utterance.voice = voiceRef.current;
          }
          window.speechSynthesis.speak(utterance);
        }
      }),
    [clear],
  );

  useEffect(() => cancel, [cancel]);

  return { speak, cancel, speaking, caption };
}
