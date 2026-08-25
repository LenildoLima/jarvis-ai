import { env } from "@/config/env";
import type { Message } from "@/types";

class ChatWebSocketClient {
  private socket: WebSocket | null = null;
  private messageListeners = new Set<(msg: any) => void>();
  private statusListeners = new Set<(status: "connected" | "connecting" | "disconnected" | "error") => void>();
  private currentStatus: "connected" | "connecting" | "disconnected" | "error" = "disconnected";
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentToken: string | null = null;

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

  public async getConnectedSocket(token: string): Promise<WebSocket> {
    this.currentToken = token;

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
        const wsUrl = `${env.wsUrl}/chat?token=${token}`;
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

        socket.onclose = (event) => {
          this.socket = null;
          this.updateStatus("disconnected");
          
          if (event.code === 4401) {
             this.messageListeners.forEach((listener) => listener({ type: "error_4401" }));
             return; // Do not auto reconnect if token is rejected
          }
          
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
        if (this.currentToken) {
          await this.getConnectedSocket(this.currentToken);
        }
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

  public async send(token: string, payload: any) {
    const socket = await this.getConnectedSocket(token);
    console.log("[ChatWebSocketClient] Enviando payload via WebSocket:", payload);
    socket.send(JSON.stringify(payload));
  }
}

export const chatWS = new ChatWebSocketClient();

export interface ChatService {
  sendMessage(
    token: string,
    conversationId: string,
    content: string,
    imageBase64?: string | null,
    onEvent?: (event: { type: "start" | "chunk" | "end" | "error_4401"; content?: string }) => void
  ): Promise<Message>;
}

export const chatService: ChatService = {
  async sendMessage(token, conversationId, content, imageBase64, onEvent) {
    let fullResponse = "";

    return new Promise<Message>((resolve, reject) => {
      let isSettled = false;
      let timeoutId: ReturnType<typeof setTimeout>;

      const cleanup = () => {
        if (!isSettled) isSettled = true;
        clearTimeout(timeoutId);
      };

      timeoutId = setTimeout(() => {
        if (!isSettled) {
          cleanup();
          reject(new Error("Timeout: Nenhuma resposta do assistente (20s). Verifique se o backend está rodando e tente novamente."));
        }
      }, 20000);

      const unsubscribe = chatWS.addListener((msg) => {
        if (msg.type === "start") {
          clearTimeout(timeoutId);
          onEvent?.({ type: "start" });
        } else if (msg.type === "chunk") {
          clearTimeout(timeoutId);
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
        } else if (msg.type === "error_4401") {
          unsubscribe();
          clearTimeout(timeoutId);
          onEvent?.({ type: "error_4401" });
          if (!isSettled) {
             reject(new Error("Unauthorized Web Socket Connection"));
          }
        }
      });

      const payload: any = { conversation_id: conversationId, content };
      if (imageBase64) {
        payload.image_base64 = imageBase64;
      }

      console.log("[chatService] Enviando payload WebSocket:", {
        conversation_id: payload.conversation_id,
        content_length: payload.content.length,
        image_base64_present: !!payload.image_base64,
        image_base64_length: payload.image_base64?.length || 0
      });

      chatWS.send(token, payload)
        .catch((err) => {
          unsubscribe();
          clearTimeout(timeoutId);
          if (!isSettled) {
            reject(err);
          }
        });
    });
  },
};