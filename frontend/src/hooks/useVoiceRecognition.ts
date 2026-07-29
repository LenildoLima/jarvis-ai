import { useCallback, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | undefined;
  return Ctor ? new Ctor() : null;
}

/** Stub funcional com Web Speech API; futuramente streaming via FastAPI. */
export function useVoiceRecognition(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => typeof window !== "undefined" && !!getRecognition());
  const ref = useRef<SpeechRecognitionLike | null>(null);

  const stop = useCallback(() => {
    ref.current?.stop();
    ref.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const recognition = getRecognition();
    if (!recognition) {
      setListening(true);
      setTimeout(() => {
        setListening(false);
        onTranscript("Como está o desempenho do sistema agora?");
      }, 2200);
      return;
    }
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) onTranscript(transcript);
    };
    recognition.onend = () => setListening(false);
    ref.current = recognition;
    recognition.start();
    setListening(true);
  }, [onTranscript]);

  return { listening, supported, start, stop, toggle: () => (listening ? stop() : start()) };
}