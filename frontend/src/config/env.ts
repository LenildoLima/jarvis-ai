export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? "",
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
  wsUrl: import.meta.env.VITE_WS_URL ?? "",
} as const;

export const APP_NAME = "BELL";
export const APP_VERSION = "0.9.4";
export const APP_TAGLINE = "Assistente pessoal de interface neural";

export const BOOT_SEQUENCE = [
  "Inicializando sistemas...",
  "Verificando módulos...",
  "Calibrando núcleo de voz...",
  "Conectando memória...",
  "Interface carregada.",
] as const;

export const SUGGESTION_CHIPS = [
  "Resumo do meu dia",
  "Status do sistema",
  "Tocar foco profundo",
  "Criar lembrete",
] as const;