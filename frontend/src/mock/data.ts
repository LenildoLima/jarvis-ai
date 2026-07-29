import type {
  Conversation,
  Memory,
  Message,
  NotificationItem,
  Plugin,
  SystemStats,
  User,
} from "@/types";

export const delay = (ms = 420) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockUser: User = {
  id: "usr_001",
  name: "Comandante",
  email: "comandante@nova.ai",
  avatarUrl: null,
  createdAt: "2025-11-02T10:00:00.000Z",
};

export const mockConversations: Conversation[] = [
  {
    id: "cnv_01",
    title: "Rotina matinal",
    preview: "Preparar briefing diário às 07:00",
    updatedAt: "2026-07-29T08:12:00.000Z",
    messageCount: 14,
  },
  {
    id: "cnv_02",
    title: "Arquitetura FastAPI",
    preview: "Camada de serviços e WebSocket",
    updatedAt: "2026-07-28T21:40:00.000Z",
    messageCount: 32,
  },
  {
    id: "cnv_03",
    title: "Automação da casa",
    preview: "Cenário noturno com luzes âmbar",
    updatedAt: "2026-07-27T23:05:00.000Z",
    messageCount: 8,
  },
  {
    id: "cnv_04",
    title: "Relatório de energia",
    preview: "Consumo semanal caiu 12%",
    updatedAt: "2026-07-26T16:22:00.000Z",
    messageCount: 5,
  },
];

export const mockMessages: Message[] = [
  {
    id: "msg_01",
    conversationId: "cnv_01",
    role: "assistant",
    content:
      "Boa noite. Bem-vindo de volta. Todos os sistemas estão operando normalmente.",
    createdAt: "2026-07-29T08:10:00.000Z",
  },
  {
    id: "msg_02",
    conversationId: "cnv_01",
    role: "user",
    content: "Qual é a situação do núcleo agora?",
    createdAt: "2026-07-29T08:10:30.000Z",
  },
  {
    id: "msg_03",
    conversationId: "cnv_01",
    role: "assistant",
    content:
      "Núcleo estável a 41°C, uso de CPU em 24% e latência de rede em 18 ms. Nenhum alerta ativo nas últimas 12 horas.",
    createdAt: "2026-07-29T08:10:44.000Z",
  },
];

export const mockAssistantReplies = [
  "Entendido. Encaminhando a tarefa para o módulo apropriado e monitorando o resultado.",
  "Processado. Encontrei três referências relevantes e organizei por prioridade.",
  "Feito. Registrei isso na memória de longo prazo para consultas futuras.",
  "Analisando telemetria... tudo dentro dos parâmetros esperados no momento.",
];

export const mockMemories: Memory[] = [
  {
    id: "mem_01",
    kind: "preference",
    title: "Tom de resposta",
    content: "Prefere respostas curtas, diretas e técnicas.",
    confidence: 0.94,
    createdAt: "2026-05-11T09:00:00.000Z",
  },
  {
    id: "mem_02",
    kind: "memory",
    title: "Rotina noturna",
    content: "Encerra o expediente por volta das 23h e ativa modo silencioso.",
    confidence: 0.81,
    createdAt: "2026-06-01T22:10:00.000Z",
  },
  {
    id: "mem_03",
    kind: "knowledge",
    title: "Stack principal",
    content: "Python/FastAPI no backend, React + TypeScript no frontend.",
    confidence: 0.99,
    createdAt: "2026-06-19T14:30:00.000Z",
  },
  {
    id: "mem_04",
    kind: "history",
    title: "Última calibração de voz",
    content: "Perfil de voz recalibrado com 2.400 amostras.",
    confidence: 0.72,
    createdAt: "2026-07-20T11:45:00.000Z",
  },
];

export const mockPlugins: Plugin[] = [
  { id: "plg_cal", name: "Calendário", description: "Agenda, eventos e lembretes sincronizados.", category: "Produtividade", icon: "calendar", installed: true, version: "1.4.0" },
  { id: "plg_spo", name: "Spotify", description: "Controle de reprodução e cenários sonoros.", category: "Mídia", icon: "music", installed: true, version: "2.1.3" },
  { id: "plg_wpp", name: "WhatsApp", description: "Leitura e envio de mensagens por voz.", category: "Comunicação", icon: "message-circle", installed: false, version: "0.9.1" },
  { id: "plg_mail", name: "E-mail", description: "Triagem inteligente e respostas rápidas.", category: "Comunicação", icon: "mail", installed: true, version: "1.8.2" },
  { id: "plg_sys", name: "Sistema", description: "Telemetria profunda do host e processos.", category: "Núcleo", icon: "cpu", installed: true, version: "3.0.0" },
  { id: "plg_ha", name: "Home Assistant", description: "Cenários, luzes, clima e sensores.", category: "Casa", icon: "home", installed: false, version: "1.2.7" },
  { id: "plg_ard", name: "Arduino", description: "Ponte serial para dispositivos embarcados.", category: "Hardware", icon: "circuit-board", installed: false, version: "0.6.4" },
];

export const mockNotifications: NotificationItem[] = [
  { id: "ntf_01", title: "Módulo de voz atualizado", description: "Latência reduzida em 18%.", level: "success", createdAt: "2026-07-29T07:50:00.000Z" },
  { id: "ntf_02", title: "Temperatura acima da média", description: "GPU atingiu 71°C durante 4 minutos.", level: "warning", createdAt: "2026-07-29T06:12:00.000Z" },
  { id: "ntf_03", title: "Backup de memória concluído", description: "1.284 registros arquivados.", level: "info", createdAt: "2026-07-28T23:00:00.000Z" },
];

const series = (base: number, spread: number) =>
  Array.from({ length: 24 }, (_, i) =>
    Math.max(2, Math.round(base + Math.sin(i / 2.4) * spread + (i % 4) * 1.6)),
  );

export function buildSystemStats(seed = 0): SystemStats {
  const jitter = (n: number, amp: number) =>
    Math.max(1, Math.min(99, Math.round(n + Math.sin(seed / 3 + n) * amp)));
  return {
    cpu: { label: "CPU", value: jitter(26, 8), unit: "%", detail: "12 núcleos · 3.8 GHz", history: series(26, 9) },
    ram: { label: "RAM", value: jitter(54, 6), unit: "%", detail: "17.2 / 32 GB", history: series(54, 7) },
    gpu: { label: "GPU", value: jitter(38, 12), unit: "%", detail: "RTX · 12 GB", history: series(38, 13) },
    temperature: { label: "Temperatura", value: jitter(46, 4), unit: "°C", detail: "Núcleo estável", history: series(46, 5) },
    disk: { label: "Disco", value: jitter(63, 2), unit: "%", detail: "1.2 / 2 TB", history: series(63, 3) },
    network: { label: "Rede", value: jitter(21, 14), unit: "Mb/s", detail: "Latência 18 ms", history: series(21, 15) },
    processes: [
      { id: "p1", name: "nova-core", cpu: 12.4, ram: 8.1 },
      { id: "p2", name: "voice-engine", cpu: 7.9, ram: 4.6 },
      { id: "p3", name: "vector-store", cpu: 5.2, ram: 11.3 },
      { id: "p4", name: "plugin-bridge", cpu: 2.7, ram: 2.2 },
      { id: "p5", name: "telemetry", cpu: 1.1, ram: 0.9 },
    ],
    updatedAt: new Date().toISOString(),
  };
}