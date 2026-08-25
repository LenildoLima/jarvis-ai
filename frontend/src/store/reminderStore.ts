import { create } from "zustand";
import { remindersService } from "@/services/remindersService";
import type { Reminder } from "@/types/reminder";

export interface ReminderAlert {
  id: string; // reminder id
  title: string;
  location: string | null;
  event_time: string;
  event_date: string;
}

interface ReminderState {
  reminders: Reminder[];
  pendingAlerts: ReminderAlert[];
  loadReminders: (token: string | null) => Promise<void>;
  markNotified: (token: string | null, id: string) => Promise<void>;
  removeReminder: (token: string | null, id: string) => Promise<void>;
  dismissAlert: (id: string) => void;
  addAlert: (alert: ReminderAlert) => void;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  pendingAlerts: [],

  loadReminders: async (token) => {
    if (!token) return;
    try {
      const reminders = await remindersService.listReminders(token);
      set({ reminders });
    } catch (err) {
      console.error("[ReminderStore] loadReminders error:", err);
    }
  },

  markNotified: async (token, id) => {
    if (!token) return;
    try {
      await remindersService.markNotified(token, id);
      set((s) => ({
        reminders: s.reminders.map((r) =>
          r.id === id ? { ...r, notified: true } : r
        ),
      }));
    } catch (err) {
      console.error("[ReminderStore] markNotified error:", err);
    }
  },

  removeReminder: async (token, id) => {
    if (!token) return;
    // Optimistic update
    const previous = get().reminders;
    set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) }));
    try {
      await remindersService.deleteReminder(token, id);
    } catch (err) {
      console.error("[ReminderStore] removeReminder error:", err);
      set({ reminders: previous });
      throw err;
    }
  },

  addAlert: (alert) => {
    set((s) => ({
      pendingAlerts: [...s.pendingAlerts, alert],
    }));
  },

  dismissAlert: (id) => {
    set((s) => ({
      pendingAlerts: s.pendingAlerts.filter((a) => a.id !== id),
    }));
  },
}));
