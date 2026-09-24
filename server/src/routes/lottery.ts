import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authGuard } from "../auth.js";
import { env } from "../env.js";
import {
  LOTTERIES,
  concursoPublico,
  fetchConcurso,
  isLottery,
  persistDraws,
  refreshLottery,
  statusDasModalidades,
} from "../lotteryData.js";
import { relatorioTransparencia } from "../transparencia.js";

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(5000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const walletGameSchema = z.object({
  id: z.string().min(1),
  lottery: z.enum(LOTTERIES),
  numbers: z.array(z.number().int().positive()).min(1),
  extra: z.record(z.unknown()).nullish(),
  strategy: z.string().min(1),
  strategyLabel: z.string().min(1),
  cost: z.number().nonnegative(),
  score: z.number().int().min(0).max(100),
  scoreLabel: z.string().min(1),
  analysis: z.record(z.unknown()).nullish(),
  isBet: z.boolean().optional(),
  notes: z.string().nullish(),
  folder: z.string().nullish(),
  bolaoId: z.string().nullish(),
  concursoAlvo: z.number().int().positive().nullish(),
  checkResult: z.record(z.unknown()).nullish(),
  createdAt: z.string().optional(),
});

const walletSyncSchema = z.object({
  games: z.array(walletGameSchema).max(500),
});

export async function lotteryRoutes(app: FastifyInstance): Promise<void> {
  /* ---------------------------------------------------------------- *
   * Saúde dos dados e transparência — públicos
   * ---------------------------------------------------------------- */

  app.get("/lottery/status", async (_request, reply) => {
    const modalidades = await statusDasModalidades();
    const falhasRecentes = await prisma.lotterySyncLog.findMany({
      where: { ok: false },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: { lottery: true, startedAt: true, error: true },
    });

    return reply.header("Cache-Control", "public, max-age=60").send({
      geradoEm: new Date().toISOString(),
      intervaloMinutos: env.SYNC_INTERVAL_MINUTES,
      modalidades,
      falhasRecentes: falhasRecentes.map((falha) => ({
        lottery: falha.lottery,
        em: falha.startedAt.toISOString(),
        erro: falha.error,
      })),
    });
  });

  app.get("/lottery/transparencia/:lottery", async (request, reply) => {
    const { lottery } = request.params as { lottery: string };
    if (!isLottery(lottery)) {
      return reply.code(404).send({ message: "Modalidade desconhecida" });
    }

    const relatorio = await relatorioTransparencia(lottery);
    return reply.header("Cache-Control", "public, max-age=300").send(relatorio);
  });

  /* ---------------------------------------------------------------- *
   * Resultados — públicos
   * ---------------------------------------------------------------- */

  app.get("/lottery/:lottery/history", async (request, reply) => {
    const { lottery } = request.params as { lottery: string };
    if (!isLottery(lottery)) {
      return reply.code(404).send({ message: "Modalidade desconhecida" });
    }

    const parsed = historyQuerySchema.safeParse(request.query);
    const limit = parsed.success ? (parsed.data.limit ?? 1000) : 1000;
    const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;

    // Espera a sincronização do concurso do dia. Se a fonte externa travar,
    // responde com o cache em vez de deixar a Carteira no concurso antigo.
    // Páginas antigas do histórico não dependem do concurso do dia.
    if (offset === 0) {
      await Promise.race([
        refreshLottery(lottery, app.log),
        new Promise((resolve) => setTimeout(resolve, 8000)),
      ]);
    }

    const [registros, total] = await Promise.all([
      prisma.lotteryDrawCache.findMany({
        where: { lottery },
        orderBy: { concurso: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.lotteryDrawCache.count({ where: { lottery } }),
    ]);

    return reply
      .header("Cache-Control", offset === 0 ? "public, max-age=60" : "public, max-age=3600")
      .send({
        lottery,
        total,
        offset,
        draws: registros.map(concursoPublico),
      });
  });

  app.get("/lottery/:lottery/latest", async (request, reply) => {
    const { lottery } = request.params as { lottery: string };
    if (!isLottery(lottery)) {
      return reply.code(404).send({ message: "Modalidade desconhecida" });
    }

    await refreshLottery(lottery, app.log);

    const registro = await prisma.lotteryDrawCache.findFirst({
      where: { lottery },
      orderBy: { concurso: "desc" },
    });

    if (!registro) {
      return reply.code(503).send({ message: "Resultado ainda não disponível" });
    }

    return reply.header("Cache-Control", "public, max-age=120").send(concursoPublico(registro));
  });

  app.get("/lottery/:lottery/:concurso", async (request, reply) => {
    const { lottery, concurso } = request.params as { lottery: string; concurso: string };
    if (!isLottery(lottery)) {
      return reply.code(404).send({ message: "Modalidade desconhecida" });
    }

    const numero = Number(concurso);
    if (!Number.isInteger(numero) || numero <= 0) {
      return reply.code(400).send({ message: "Concurso inválido" });
    }

    let registro = await prisma.lotteryDrawCache.findUnique({
      where: { lottery_concurso: { lottery, concurso: numero } },
    });

    if (!registro) {
      const normalizado = await fetchConcurso(lottery, numero);
      if (normalizado) {
        await persistDraws([normalizado]);
        registro = await prisma.lotteryDrawCache.findUnique({
          where: { lottery_concurso: { lottery, concurso: numero } },
        });
      }
    }

    if (!registro) {
      return reply.code(404).send({ message: "Concurso não encontrado" });
    }

    return reply.header("Cache-Control", "public, max-age=86400").send(concursoPublico(registro));
  });

  /* ---------------------------------------------------------------- *
   * Carteira sincronizada — exige login
   * ---------------------------------------------------------------- */

  app.get("/lottery/wallet", { preHandler: authGuard }, async (request) => {
    const games = await prisma.lotteryWalletGame.findMany({
      where: { userId: request.user.id },
      orderBy: { createdAt: "desc" },
    });

    return {
      games: games.map((game) => ({
        id: game.id,
        lottery: game.lottery,
        numbers: game.numbers,
        extra: game.extra ?? undefined,
        strategy: game.strategy,
        strategyLabel: game.strategyLabel,
        cost: game.cost,
        score: game.score,
        scoreLabel: game.scoreLabel,
        analysis: game.analysis ?? undefined,
        isBet: game.isBet,
        notes: game.notes ?? undefined,
        folder: game.folder ?? undefined,
        bolaoId: game.bolaoId ?? undefined,
        concursoAlvo: game.concursoAlvo ?? undefined,
        checkResult: game.checkResult ?? undefined,
        createdAt: game.createdAt.toISOString(),
      })),
    };
  });

  app.put("/lottery/wallet", { preHandler: authGuard }, async (request, reply) => {
    const parsed = walletSyncSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const userId = request.user.id;
    const { games } = parsed.data;

    // A carteira do cliente é a fonte da verdade no momento do sync: o que
    // sumiu lá foi apagado pelo usuário e precisa sumir aqui também.
    const enviados = new Set(games.map((game) => game.id));

    const existentes = await prisma.lotteryWalletGame.findMany({
      where: { id: { in: Array.from(enviados) } },
      select: { id: true, userId: true, numbers: true, concursoAlvo: true },
    });
    const porId = new Map(existentes.map((game) => [game.id, game]));

    // Um id que já pertence a outra conta não pode ser sobrescrito.
    const proprios = games.filter((game) => {
      const existente = porId.get(game.id);
      return !existente || existente.userId === userId;
    });

    await prisma.$transaction([
      prisma.lotteryWalletGame.deleteMany({
        where: { userId, id: { notIn: Array.from(enviados) } },
      }),
      ...proprios.map((game) => {
        const existente = porId.get(game.id);
        const mudouAposta =
          existente !== undefined &&
          (JSON.stringify(existente.numbers) !== JSON.stringify(game.numbers) ||
            (existente.concursoAlvo ?? null) !== (game.concursoAlvo ?? null));

        const dados = {
          lottery: game.lottery,
          numbers: game.numbers,
          extra: (game.extra as any) ?? undefined,
          strategy: game.strategy,
          strategyLabel: game.strategyLabel,
          cost: game.cost,
          score: game.score,
          scoreLabel: game.scoreLabel,
          analysis: (game.analysis as any) ?? undefined,
          isBet: game.isBet ?? false,
          notes: game.notes ?? null,
          folder: game.folder ?? null,
          bolaoId: game.bolaoId ?? null,
          concursoAlvo: game.concursoAlvo ?? null,
          checkResult: (game.checkResult as any) ?? undefined,
        };

        return prisma.lotteryWalletGame.upsert({
          where: { id: game.id },
          create: {
            id: game.id,
            userId,
            createdAt: game.createdAt ? new Date(game.createdAt) : new Date(),
            ...dados,
          },
          // Trocar dezenas ou concurso reinicia o carimbo: senão daria para
          // ajustar o bilhete depois do sorteio e entrar no placar.
          update: mudouAposta ? { ...dados, registradoEm: new Date() } : dados,
        });
      }),
    ]);

    return { synced: proprios.length };
  });
}
