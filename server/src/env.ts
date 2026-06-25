function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL", process.env.DATABASE_URL),
  JWT_SECRET: required("JWT_SECRET", process.env.JWT_SECRET),
  PORT: Number(process.env.PORT ?? 8080),
  HOST: process.env.HOST ?? "0.0.0.0",
  // Comma-separated list of allowed origins. Use "*" to allow all (dev only).
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
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
