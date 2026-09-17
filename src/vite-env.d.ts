/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base do backend (Railway). Vazio = usa armazenamento local no navegador. */
  readonly VITE_API_URL?: string;
  /** Chave da API DeepSeek (opcional; também configurável em Configurações). */
  readonly VITE_DEEPSEEK_API_KEY?: string;
  /** Domínio oficial do site, usado na URL canônica. Vazio = origem do navegador. */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
