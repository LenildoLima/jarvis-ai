import { useCallback, useEffect, useRef, useState } from "react";

/** Stub com SpeechSynthesis + legendas ao vivo; futuramente áudio via FastAPI. */
export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [caption, setCaption] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

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
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = "pt-BR";
          utterance.rate = 1.02;
          window.speechSynthesis.speak(utterance);
        }
      }),
    [clear],
  );

  useEffect(() => cancel, [cancel]);

  return { speak, cancel, speaking, caption };
}