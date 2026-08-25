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

function mapConversation(c: any): Conversation {
  return {
    ...c,
    updatedAt: c.updated_at || c.updatedAt,
    messageCount: c.message_count ?? c.messageCount ?? 0,
  };
}

function mapMessage(m: any): Message {
  return {
    ...m,
    conversationId: m.conversation_id || m.conversationId,
    createdAt: m.created_at || m.createdAt,
    imageBase64: m.image_base64 || m.imageBase64,
  };
}

export const conversationsService = {
  async listConversations(token: string | null, query = ""): Promise<Conversation[]> {
    const data: any[] = await apiFetch("/conversations", token);
    
    const mappedData = (data || []).map(mapConversation);
    const q = query.trim().toLowerCase();
    if (!q) return mappedData;
    
    return mappedData.filter(
      (c) => c.title?.toLowerCase().includes(q) || c.preview?.toLowerCase().includes(q)
    );
  },

  async createConversation(token: string | null): Promise<Conversation> {
    const data = await apiFetch("/conversations", token, {
      method: "POST",
    });
    return mapConversation(data);
  },

  async listMessages(token: string | null, id: string): Promise<Message[]> {
    const data: any[] = await apiFetch(`/conversations/${id}/messages`, token);
    return (data || []).map(mapMessage);
  },
};
