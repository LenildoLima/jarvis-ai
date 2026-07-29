import { delay, mockAssistantReplies, mockConversations, mockMessages } from "@/mock/data";
import type { Conversation, Message } from "@/types";

export interface ChatService {
  listConversations(query?: string): Promise<Conversation[]>;
  createConversation(): Promise<Conversation>;
  listMessages(conversationId: string): Promise<Message[]>;
  sendMessage(conversationId: string, content: string): Promise<Message>;
}

export const chatService: ChatService = {
  async listConversations(query = "") {
    await delay(500);
    const q = query.trim().toLowerCase();
    if (!q) return mockConversations;
    return mockConversations.filter(
      (c) => c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q),
    );
  },
  async createConversation() {
    await delay(240);
    return {
      id: `cnv_${Math.random().toString(36).slice(2, 8)}`,
      title: "Nova conversa",
      preview: "Sem mensagens ainda",
      updatedAt: new Date().toISOString(),
      messageCount: 0,
    };
  },
  async listMessages(conversationId) {
    await delay(360);
    return mockMessages.map((m) => ({ ...m, conversationId }));
  },
  async sendMessage(conversationId, content) {
    await delay(900 + Math.random() * 700);
    const reply = mockAssistantReplies[Math.floor(Math.random() * mockAssistantReplies.length)];
    return {
      id: `msg_${Math.random().toString(36).slice(2, 8)}`,
      conversationId,
      role: "assistant",
      content: `${reply} (referente a: “${content.slice(0, 48)}”)`,
      createdAt: new Date().toISOString(),
    };
  },
};