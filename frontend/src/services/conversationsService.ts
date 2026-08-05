import { env } from "@/config/env";
import type { Conversation, Message } from "@/types";

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

  return res.json();
}

export const conversationsService = {
  async listConversations(token: string | null, query = ""): Promise<Conversation[]> {
    const data: Conversation[] = await apiFetch("/conversations", token);
    
    // Client-side search for simplicity if backend doesn't support query param yet
    const q = query.trim().toLowerCase();
    if (!q) return data || [];
    
    return (data || []).filter(
      (c) => c.title?.toLowerCase().includes(q) || c.preview?.toLowerCase().includes(q)
    );
  },

  async createConversation(token: string | null): Promise<Conversation> {
    return apiFetch("/conversations", token, {
      method: "POST",
    });
  },

  async listMessages(token: string | null, id: string): Promise<Message[]> {
    return apiFetch(`/conversations/${id}/messages`, token);
  },
};
