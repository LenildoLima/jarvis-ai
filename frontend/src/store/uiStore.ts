import { create } from "zustand";
import { mockNotifications } from "@/mock/data";
import type { NotificationItem } from "@/types";

interface UIState {
  commandOpen: boolean;
  booted: boolean;
  notifications: NotificationItem[];
  settings: Record<string, boolean>;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;
  setBooted: (booted: boolean) => void;
  dismissNotification: (id: string) => void;
  toggleSetting: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  commandOpen: false,
  booted: false,
  notifications: mockNotifications,
  settings: { voice: true, captions: true, telemetry: true },
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
  setBooted: (booted) => set({ booted }),
  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
  toggleSetting: (id) =>
    set((s) => ({ settings: { ...s.settings, [id]: !s.settings[id] } })),
}));