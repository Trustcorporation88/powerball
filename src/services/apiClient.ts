/**
 * Cliente HTTP para o backend (Railway).
 *
 * Se `VITE_API_URL` estiver definido, o app usa essa URL. Em produção, se a
 * variável não foi injetada no build, cai na API pública do Powerball — senão
 * o login grava a conta só no navegador e a mensagem vira "Email não encontrado".
 */

const FALLBACK_API_URL = "https://apipowerball-production.up.railway.app";

const RAW_API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  (import.meta.env.PROD ? FALLBACK_API_URL : "");

export const API_URL = RAW_API_URL.replace(/\/+$/, "");

const TOKEN_KEY = "powerball:token";
const LEGACY_TOKEN_KEY = "datafin:token";

export function isRemote(): boolean {
  return API_URL.length > 0;
}

export function getToken(): string {
  try {
    const atual = window.localStorage.getItem(TOKEN_KEY);
    if (atual) return atual;
    const legado = window.localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legado) {
      window.localStorage.setItem(TOKEN_KEY, legado);
      window.localStorage.removeItem(LEGACY_TOKEN_KEY);
      return legado;
    }
    return "";
  } catch {
    return "";
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* ignore storage errors */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : `Erro ${response.status}`;

    if (response.status === 401) {
      // Token inválido/expirado: limpa para forçar novo login.
      setToken(null);
    }

    throw new ApiError(response.status, message);
  }

  return data as T;
}
