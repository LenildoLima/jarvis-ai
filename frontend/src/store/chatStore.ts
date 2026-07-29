import { create } from "zustand";
import { chatService } from "@/services/chatService";
import type { Conversation, Message } from "@/types";

interface ChatState {
  conversations: Conversation[];
  messages: Message[];
  activeId: string | null;
  query: string;
  loadingConversations: boolean;
  loadingMessages: boolean;
  thinking: boolean;
  setQuery: (query: string) => void;
  loadConversations: () => Promise<void>;
  newConversation: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  send: (content: string) => Promise<Message | null>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: [],
  activeId: null,
  query: "",
  loadingConversations: false,
  loadingMessages: false,
  thinking: false,

  setQuery: (query) => set({ query }),

  async loadConversations() {
    set({ loadingConversations: true });
    const conversations = await chatService.listConversations(get().query);
    set({ loadingConversations: false, conversations });
    if (!get().activeId && conversations[0]) {
      await get().selectConversation(conversations[0].id);
    }
  },

  async newConversation() {
    const conversation = await chatService.createConversation();
    set((s) => ({
      conversations: [conversation, ...s.conversations],
      activeId: conversation.id,
      messages: [],
    }));
  },

  async selectConversation(id) {
    set({ activeId: id, loadingMessages: true, messages: [] });
    const messages = await chatService.listMessages(id);
    if (get().activeId === id) set({ messages, loadingMessages: false });
  },

  async send(content) {
    const conversationId = get().activeId ?? "cnv_local";
    const userMessage: Message = {
      id: `msg_${Math.random().toString(36).slice(2, 8)}`,
      conversationId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMessage], thinking: true, activeId: conversationId }));
    const reply = await chatService.sendMessage(conversationId, content);
    set((s) => ({ messages: [...s.messages, reply], thinking: false }));
    return reply;
  },
}));