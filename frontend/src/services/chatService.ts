import { env } from "@/config/env";
import type { Conversation, Message } from "@/types";
import { delay, mockConversations, mockMessages } from "@/mock/data";

class ChatWebSocketClient {
  private socket: WebSocket | null = null;
  private messageListeners = new Set<(msg: any) => void>();
  private statusListeners = new Set<(status: "connected" | "connecting" | "disconnected" | "error") => void>();
  private currentStatus: "connected" | "connecting" | "disconnected" | "error" = "disconnected";
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private updateStatus(status: "connected" | "connecting" | "disconnected" | "error") {
    this.currentStatus = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  public getStatus() {
    return this.currentStatus;
  }

  public onStatusChange(listener: (status: "connected" | "connecting" | "disconnected" | "error") => void): () => void {
    this.statusListeners.add(listener);
    // immediately call with current status
    listener(this.currentStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public async getConnectedSocket(): Promise<WebSocket> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return this.socket;
    }

    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      const socket = this.socket;
      return new Promise<WebSocket>((resolve, reject) => {
        const onOpen = () => {
          socket.removeEventListener("open", onOpen);
          socket.removeEventListener("error", onError);
          resolve(socket);
        };
        const onError = (e: Event) => {
          socket.removeEventListener("open", onOpen);
          socket.removeEventListener("error", onError);
          reject(e);
        };
        socket.addEventListener("open", onOpen);
        socket.addEventListener("error", onError);
      });
    }

    return new Promise<WebSocket>((resolve, reject) => {
      try {
        this.updateStatus("connecting");
        const wsUrl = `${env.wsUrl}/chat`;
        const socket = new WebSocket(wsUrl);
        this.socket = socket;

        socket.onopen = () => {
          this.updateStatus("connected");
          resolve(socket);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.messageListeners.forEach((listener) => listener(data));
          } catch (e) {
            console.error("Error parsing chat WS message:", e);
          }
        };

        socket.onclose = () => {
          this.socket = null;
          this.updateStatus("disconnected");
          this.triggerReconnect();
        };

        socket.onerror = (e) => {
          console.error("Chat WS error:", e);
          this.updateStatus("error");
        };
      } catch (err) {
        this.updateStatus("error");
        reject(err);
      }
    });
  }

  private triggerReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      try {
        await this.getConnectedSocket();
      } catch (err) {
        console.error("Auto reconnect to Chat WS failed:", err);
        this.triggerReconnect();
      }
    }, 3000);
  }

  public addListener(listener: (msg: any) => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  public async send(payload: any) {
    const socket = await this.getConnectedSocket();
    socket.send(JSON.stringify(payload));
  }
}

export const chatWS = new ChatWebSocketClient();

// Connect early — only in browser context (Vite SSR runs this in Node where window/WebSocket don't exist)
if (typeof window !== "undefined") {
  void chatWS.getConnectedSocket().catch((err) => {
    console.warn("Could not connect to Chat WS initially, will retry when sending message:", err);
  });
}

export interface ChatService {
  listConversations(query?: string): Promise<Conversation[]>;
  createConversation(): Promise<Conversation>;
  listMessages(conversationId: string): Promise<Message[]>;
  sendMessage(
    conversationId: string,
    content: string,
    onEvent?: (event: { type: "start" | "chunk" | "end"; content?: string }) => void
  ): Promise<Message>;
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
  async sendMessage(conversationId, content, onEvent) {
    let fullResponse = "";

    return new Promise<Message>((resolve, reject) => {
      let isSettled = false;

      const unsubscribe = chatWS.addListener((msg) => {
        if (msg.type === "start") {
          onEvent?.({ type: "start" });
        } else if (msg.type === "chunk") {
          fullResponse += msg.content || "";
          onEvent?.({ type: "chunk", content: msg.content || "" });
        } else if (msg.type === "end") {
          unsubscribe();
          isSettled = true;
          
          resolve({
            id: `msg_${Math.random().toString(36).slice(2, 8)}`,
            conversationId,
            role: "assistant",
            content: fullResponse,
            createdAt: new Date().toISOString(),
          });
        }
      });

      chatWS.send({ conversation_id: conversationId, content })
        .catch((err) => {
          unsubscribe();
          if (!isSettled) {
            reject(err);
          }
        });
    });
  },
};