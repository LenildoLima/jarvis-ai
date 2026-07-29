import { delay } from "@/mock/data";

export interface VoiceService {
  transcribe(blobOrText: string): Promise<string>;
  speak(text: string): Promise<void>;
  stop(): void;
}

export const voiceService: VoiceService = {
  async transcribe(input) {
    await delay(600);
    return input;
  },
  async speak(text) {
    await delay(Math.min(4000, 400 + text.length * 18));
  },
  stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  },
};