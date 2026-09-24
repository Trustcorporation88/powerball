import { PrismaClient } from "@prisma/client";

/**
 * O pooler do Supabase em modo sessão aceita 15 clientes. Sem limite, o
 * Prisma abre 2×CPUs+1 conexões e estoura esse teto nas máquinas do Railway.
 * Quem já define `connection_limit` na URL continua mandando.
 */
const LIMITE_PADRAO = 5;

function urlComLimite(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", String(LIMITE_PADRAO));
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

const url = urlComLimite(process.env.DATABASE_URL);

export const prisma = new PrismaClient(url ? { datasources: { db: { url } } } : undefined);
