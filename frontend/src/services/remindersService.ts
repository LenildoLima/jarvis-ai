import { env } from "@/config/env";
import type { Reminder } from "@/types/reminder";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

async function apiFetch(endpoint: string, token: string | null, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${env.apiUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    throw new UnauthorizedError();
  }

  if (!res.ok) {
    throw new Error(`API error: ${res.statusText}`);
  }

  // Some endpoints return empty body (e.g. PATCH /notified, DELETE)
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

export const remindersService = {
  async listReminders(token: string | null): Promise<Reminder[]> {
    const data = await apiFetch("/reminders", token);
    return Array.isArray(data) ? data : [];
  },

  async markNotified(token: string | null, id: string): Promise<void> {
    await apiFetch(`/reminders/${id}/notified`, token, { method: "PATCH" });
  },

  async deleteReminder(token: string | null, id: string): Promise<void> {
    await apiFetch(`/reminders/${id}`, token, { method: "DELETE" });
  },
};
