import { create } from "zustand";
import { chatService, chatWS } from "@/services/chatService";
import { useAssistantStore } from "@/store/assistantStore";
import type { Conversation, Message } from "@/types";

interface ChatState {
  conversations: Conversation[];
  messages: Message[];
  activeId: string | null;
  query: string;
  loadingConversations: boolean;
  loadingMessages: boolean;
  thinking: boolean;
  socketStatus: "connected" | "connecting" | "disconnected" | "error";
  setQuery: (query: string) => void;
  loadConversations: () => Promise<void>;
  newConversation: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  send: (content: string) => Promise<Message | null>;
}

export const useChatStore = create<ChatState>((set, get) => {
  // Listen to WebSocket client status changes
  chatWS.onStatusChange((status) => {
    set({ socketStatus: status });
  });

  return {
    conversations: [],
    messages: [],
    activeId: null,
    query: "",
    loadingConversations: false,
    loadingMessages: false,
    thinking: false,
    socketStatus: "disconnected",

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
      set((s) => ({
        messages: [...s.messages, userMessage],
        thinking: true,
        activeId: conversationId,
      }));

      const assistantMessageId = `msg_${Math.random().toString(36).slice(2, 8)}`;
      let hasCreatedAssistantMessage = false;

      try {
        const reply = await chatService.sendMessage(
          conversationId,
          content,
          (event) => {
            if (event.type === "start") {
              set({ thinking: true });
              useAssistantStore.getState().setStatus("processing");
            } else if (event.type === "chunk") {
              set((s) => {
                if (!hasCreatedAssistantMessage) {
                  hasCreatedAssistantMessage = true;
                  const newAssistantMsg: Message = {
                    id: assistantMessageId,
                    conversationId,
                    role: "assistant",
                    content: event.content || "",
                    createdAt: new Date().toISOString(),
                  };
                  return {
                    messages: [...s.messages, newAssistantMsg],
                  };
                } else {
                  return {
                    messages: s.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: m.content + (event.content || "") }
                        : m
                    ),
                  };
                }
              });
            }
          }
        );

        set((s) => {
          const exists = s.messages.some((m) => m.id === assistantMessageId);
          let updatedMessages = s.messages;
          if (!exists) {
            updatedMessages = [...s.messages, reply];
          } else {
            updatedMessages = s.messages.map((m) =>
              m.id === assistantMessageId ? reply : m
            );
          }
          return {
            messages: updatedMessages,
            thinking: false,
          };
        });

        return reply;
      } catch (err) {
        console.error("Chat WebSocket request failed:", err);
        set({ thinking: false });
        
        const errorMsg: Message = {
          id: `msg_err_${Math.random().toString(36).slice(2, 8)}`,
          conversationId,
          role: "assistant",
          content: "Desculpe, ocorreu um erro de conexão com o núcleo neural. Por favor, tente novamente.",
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ messages: [...s.messages, errorMsg] }));
        return errorMsg;
      }
    },
  };
});