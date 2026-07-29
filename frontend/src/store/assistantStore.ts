import { create } from "zustand";
import type { AssistantStatus, ConnectionStatus } from "@/types";

interface AssistantState {
  status: AssistantStatus;
  amplitude: number;
  caption: string;
  connection: ConnectionStatus;
  setStatus: (status: AssistantStatus) => void;
  setAmplitude: (amplitude: number) => void;
  setCaption: (caption: string) => void;
  setConnection: (connection: ConnectionStatus) => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  status: "idle",
  amplitude: 0.2,
  caption: "",
  connection: "connected",
  setStatus: (status) => set({ status }),
  setAmplitude: (amplitude) => set({ amplitude }),
  setCaption: (caption) => set({ caption }),
  setConnection: (connection) => set({ connection }),
}));