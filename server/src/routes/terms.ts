import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authGuard } from "../auth.js";

/**
 * Aceite do termo de uso e isenção de responsabilidade.
 *
 * O texto vive no frontend; aqui fica só a prova de que determinado usuário
 * concordou com determinada versão, em determinado momento. Guardamos IP e
 * navegador porque são o que dá lastro ao registro se ele precisar ser
 * apresentado depois.
 */

const acceptSchema = z.object({
  version: z.string().min(1).max(20),
});

/** Atrás do proxy do Railway o IP real vem no X-Forwarded-For. */
function clientIp(request: FastifyRequest): string | null {
  const encaminhado = request.headers["x-forwarded-for"];
  if (typeof encaminhado === "string" && encaminhado.length > 0) {
    return encaminhado.split(",")[0]!.trim().slice(0, 45);
  }
  return request.ip ? request.ip.slice(0, 45) : null;
}

export async function termsRoutes(app: FastifyInstance): Promise<void> {
  /** Aceites do usuário logado, do mais recente para o mais antigo. */
  app.get("/terms/acceptances", { preHandler: authGuard }, async (request) => {
    const aceites = await prisma.lotteryTermAcceptance.findMany({
      where: { userId: request.user.id },
      orderBy: { acceptedAt: "desc" },
      select: { version: true, acceptedAt: true },
    });

    return {
      acceptances: aceites.map((aceite) => ({
        version: aceite.version,
        acceptedAt: aceite.acceptedAt.toISOString(),
      })),
    };
  });

  app.post("/terms/accept", { preHandler: authGuard }, async (request, reply) => {
    const parsed = acceptSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Versão do termo inválida" });
    }

    const userId = request.user.id;
    const { version } = parsed.data;
    const userAgent = request.headers["user-agent"]?.slice(0, 255) ?? null;

    // Reaceitar a mesma versão não deve apagar o registro original: a data que
    // interessa é a do primeiro aceite daquele texto.
    const aceite = await prisma.lotteryTermAcceptance.upsert({
      where: { userId_version: { userId, version } },
      create: { userId, version, ip: clientIp(request), userAgent },
      update: {},
    });

    return reply.code(201).send({
      version: aceite.version,
      acceptedAt: aceite.acceptedAt.toISOString(),
    });
  });
}
