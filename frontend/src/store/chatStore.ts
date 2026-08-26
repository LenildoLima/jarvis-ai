import { create } from "zustand";
import { chatWS, chatService } from "@/services/chatService";
import { conversationsService, UnauthorizedError } from "@/services/conversationsService";
import { useAssistantStore } from "@/store/assistantStore";
import { useAuthStore } from "@/store/authStore";
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
  loadConversations: (silent?: boolean) => Promise<void>;
  newConversation: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  send: (content: string, imageBase64?: string | null) => Promise<Message | null>;
  connectWS: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => {

  // Listen to WebSocket client status changes
  chatWS.onStatusChange((status) => {
    set({ socketStatus: status });
  });

  const handleAuthError = (err: any) => {
    if (err instanceof UnauthorizedError || err.message?.includes("Unauthorized")) {
      useAuthStore.getState().logout();
      set({ conversations: [], messages: [], activeId: null });
      return true;
    }
    return false;
  };

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

    async loadConversations(silent = false) {
      const { accessToken } = useAuthStore.getState();
      if (!accessToken) return;

      if (!silent) set({ loadingConversations: true });
      try {
        const conversations = await conversationsService.listConversations(accessToken, get().query);
        set({ conversations });
        if (!silent) set({ loadingConversations: false });
        if (!get().activeId && conversations.length > 0) {
          await get().selectConversation(conversations[0].id);
        }
      } catch (err: any) {
        if (!silent) set({ loadingConversations: false });
        if (!handleAuthError(err)) {
          console.error("Failed to load conversations:", err);
        }
      }
    },

    async newConversation() {
      const { accessToken } = useAuthStore.getState();
      if (!accessToken) return;

      try {
        const conversation = await conversationsService.createConversation(accessToken);
        set((s) => ({
          conversations: [conversation, ...s.conversations],
          activeId: conversation.id,
          messages: [],
        }));
      } catch (err: any) {
         if (!handleAuthError(err)) {
          console.error("Failed to create conversation:", err);
        }
      }
    },

    async selectConversation(id) {
      const { accessToken } = useAuthStore.getState();
      if (!accessToken) return;

      set({ activeId: id, loadingMessages: true, messages: [] });
      try {
        const messages = await conversationsService.listMessages(accessToken, id);
        if (get().activeId === id) set({ messages, loadingMessages: false });
      } catch (err: any) {
        set({ loadingMessages: false });
        if (!handleAuthError(err)) {
          console.error("Failed to load messages:", err);
        }
      }
    },

    async connectWS() {
      const { accessToken } = useAuthStore.getState();
      if (!accessToken) return;
      try {
        await chatWS.getConnectedSocket(accessToken);
      } catch (err) {
        console.error("Failed to proactively connect chat WS:", err);
      }
    },

    async send(content, imageBase64) {
      const { accessToken } = useAuthStore.getState();
      if (!accessToken) return null;

      let conversationId = get().activeId;
      
      if (!conversationId) {
        try {
          const conversation = await conversationsService.createConversation(accessToken);
          conversationId = conversation.id;
          set((s) => ({
            conversations: [conversation, ...s.conversations],
            activeId: conversationId,
            messages: [],
          }));
        } catch (err: any) {
          if (!handleAuthError(err)) {
            console.error("Failed to create inline conversation:", err);
          }
          const errorMsg: Message = {
            id: `msg_err_${Math.random().toString(36).slice(2, 8)}`,
            conversationId: "error",
            role: "assistant",
            content: "Desculpe, ocorreu um erro ao iniciar uma nova conversa. Por favor, tente novamente.",
            createdAt: new Date().toISOString(),
          };
          set((s) => ({ messages: [...s.messages, errorMsg] }));
          return errorMsg;
        }
      }

      const userMessage: Message = {
        id: `msg_${Math.random().toString(36).slice(2, 8)}`,
        conversationId,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
        imageBase64,
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
          accessToken,
          conversationId,
          content,
          imageBase64,
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
            } else if (event.type === "error_4401") {
               useAuthStore.getState().logout();
               set({ conversations: [], messages: [], activeId: null });
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

        void get().loadConversations(true);

        return reply;
      } catch (err: any) {
        console.error("Chat request failed:", err);
        set({ thinking: false });

        if (err.message === "Unauthorized Web Socket Connection") {
            return null;
        }
        
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