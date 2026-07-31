export type AssistantStatus = "idle" | "listening" | "processing" | "speaking";

export type ConnectionStatus = "connected" | "reconnecting" | "offline";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  pending?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  messageCount: number;
}

export type MemoryKind = "memory" | "preference" | "knowledge" | "history";

export interface Memory {
  id: string;
  kind: MemoryKind;
  title: string;
  content: string;
  confidence: number;
  createdAt: string;
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  installed: boolean;
  version: string;
}

export interface Metric {
  label: string;
  value: number | null;
  unit: string;
  detail?: string;
  history: number[];
}

export interface SystemStats {
  cpu: Metric;
  ram: Metric;
  gpu: Metric;
  temperature: Metric;
  disk: Metric;
  network: Metric;
  processes: { id: string; name: string; cpu: number; ram: number }[];
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  level: "info" | "success" | "warning";
  createdAt: string;
}