import { env } from "@/config/env";
import { mockPlugins } from "@/mock/data";
import type { Plugin } from "@/types";

const idToBackendKey: Record<string, string> = {
  plg_cal: "calendario",
  plg_spo: "spotify",
  plg_wpp: "whatsapp",
  plg_mail: "email",
  plg_sys: "sistema",
  plg_ha: "home_assistant",
  plg_ard: "arduino",
};

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

export interface PluginService {
  list(token: string | null): Promise<Plugin[]>;
  toggle(token: string | null, id: string, installed: boolean): Promise<Plugin>;
}

export const pluginService: PluginService = {
  async list(token) {
    const states = await apiFetch("/plugins", token);
    return mockPlugins.map((p) => {
      const backendKey = idToBackendKey[p.id];
      const realState = backendKey ? states[backendKey] : p.installed;
      return { ...p, installed: !!realState };
    });
  },
  async toggle(token, id, installed) {
    const backendKey = idToBackendKey[id];
    if (!backendKey) {
       throw new Error(`Plugin id ${id} not mapped to a backend key`);
    }
    
    await apiFetch(`/plugins/${backendKey}`, token, {
      method: "PATCH",
      body: JSON.stringify({ enabled: installed }),
    });

    const plugin = mockPlugins.find((p) => p.id === id)!;
    return { ...plugin, installed };
  },
};