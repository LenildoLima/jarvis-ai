import { create } from "zustand";

interface WakeWordState {
  enabled: boolean;
  isAwake: boolean;
  isManualMicActive: boolean;
  isSpeaking: boolean;
  toggleEnabled: () => void;
  setAwake: (awake: boolean) => void;
  setManualMicActive: (active: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
}

export const useWakeWordStore = create<WakeWordState>((set) => ({
  enabled: true,
  isAwake: false,
  isManualMicActive: false,
  isSpeaking: false,
  toggleEnabled: () => set((s) => ({ enabled: !s.enabled })),
  setAwake: (awake) => set({ isAwake: awake }),
  setManualMicActive: (active) => set({ isManualMicActive: active }),
  setSpeaking: (speaking) => set({ isSpeaking: speaking }),
}));
