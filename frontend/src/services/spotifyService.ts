import { env } from "@/config/env";

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

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/** Calls GET /spotify/login and returns the OAuth authorization URL. */
export async function getLoginUrl(token: string | null): Promise<string> {
  const data = await apiFetch("/spotify/login", token);
  return data.url as string;
}

/** Calls GET /spotify/status and returns whether the account is connected. */
export async function getStatus(token: string | null): Promise<boolean> {
  const data = await apiFetch("/spotify/status", token);
  return !!data.connected;
}

/** Calls DELETE /spotify/disconnect to unlink the Spotify account. */
export async function disconnect(token: string | null): Promise<void> {
  await apiFetch("/spotify/disconnect", token, { method: "DELETE" });
}
