import { readStorage, writeStorage, removeStorage } from "./storage";

/**
 * Configuração da integração de IA (DeepSeek).
 *
 * A chave pode vir de duas fontes, nesta ordem de prioridade:
 * 1. Chave salva pelo usuário em runtime (localStorage) — definida na tela de Configurações.
 * 2. Variável de ambiente de build `VITE_DEEPSEEK_API_KEY` (configurada no deploy).
 *
 * Isso permite ativar os recursos de IA (auditoria, Assistente Excel e consultas em
 * linguagem natural) sem precisar refazer o deploy com variáveis de ambiente.
 */

export const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

const AI_KEY_STORAGE = "datafin:ai:deepseekKey";

const ENV_KEY = (import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined)?.trim() || "";

export function getDeepSeekApiKey(): string {
  const stored = readStorage<string>(AI_KEY_STORAGE, "");
  const runtime = typeof stored === "string" ? stored.trim() : "";
  return runtime || ENV_KEY;
}

export function isAIEnabled(): boolean {
  return getDeepSeekApiKey().length > 0;
}

/** Indica se a chave vem da configuração do usuário (runtime) e não do ambiente de build. */
export function hasUserDefinedKey(): boolean {
  const stored = readStorage<string>(AI_KEY_STORAGE, "");
  return typeof stored === "string" && stored.trim().length > 0;
}

export function setDeepSeekApiKey(key: string): void {
  const trimmed = key.trim();
  if (trimmed) {
    writeStorage(AI_KEY_STORAGE, trimmed);
  } else {
    removeStorage(AI_KEY_STORAGE);
  }
}

export function clearDeepSeekApiKey(): void {
  removeStorage(AI_KEY_STORAGE);
}
