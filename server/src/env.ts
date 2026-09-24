function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(value: string | undefined): string {
  return value?.trim() ?? "";
}

export const env = {
  DATABASE_URL: required("DATABASE_URL", process.env.DATABASE_URL),
  JWT_SECRET: required("JWT_SECRET", process.env.JWT_SECRET),
  PORT: Number(process.env.PORT ?? 8080),
  HOST: process.env.HOST ?? "0.0.0.0",
  // Comma-separated list of allowed origins. Use "*" to allow all (dev only).
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
  /** Endereço do site, usado no link de redefinição de senha. */
  APP_URL: (optional(process.env.APP_URL) || "https://powerballbr.com.br").replace(/\/+$/, ""),
  /** Chave da Resend (resend.com). Sem ela a recuperação de senha fica desligada. */
  RESEND_API_KEY: optional(process.env.RESEND_API_KEY),
  MAIL_FROM: optional(process.env.MAIL_FROM) || "Powerball <nao-responda@powerballbr.com.br>",
  /** Webhook (Discord, Slack ou similar) avisado quando os resultados param de chegar. */
  ALERT_WEBHOOK_URL: optional(process.env.ALERT_WEBHOOK_URL),
  /** Intervalo da sincronização automática. 0 desliga. */
  SYNC_INTERVAL_MINUTES: Number(process.env.SYNC_INTERVAL_MINUTES ?? 60),
};

export function parseCorsOrigin(value: string): string[] | boolean {
  const trimmed = value.trim();
  if (trimmed === "*" || trimmed === "") {
    return true;
  }
  return trimmed
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
