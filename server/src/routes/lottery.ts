import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authGuard } from "../auth.js";

/**
 * Proxy e cache dos resultados das loterias da Caixa.
 *
 * Por que existe: a API oficial responde 403 para chamadas vindas de
 * datacenters e não publica cabeçalhos de CORS, então nem o servidor nem o
 * navegador podem depender só dela. Aqui tentamos a Caixa primeiro e caímos
 * para um espelho público, gravando tudo em Postgres. O frontend passa a
 * consultar um endpoint estável, com histórico completo em uma requisição.
 */

const LOTTERIES = [
  "megasena",
  "lotofacil",
  "quina",
  "duplasena",
  "diadesorte",
  "maismilionaria",
] as const;

type Lottery = (typeof LOTTERIES)[number];

const CAIXA_BASE = "https://servicebus2.caixa.gov.br/portaldeloterias/api";
const MIRROR_BASE = "https://loteriascaixa-api.herokuapp.com/api";

/** Tempo mínimo entre duas idas à fonte externa para a mesma modalidade. */
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const ultimaAtualizacao = new Map<Lottery, number>();

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(2000).optional(),
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
  checkResult: z.record(z.unknown()).nullish(),
  createdAt: z.string().optional(),
});

const walletSyncSchema = z.object({
  games: z.array(walletGameSchema).max(500),
});

function isLottery(value: string): value is Lottery {
  return (LOTTERIES as readonly string[]).includes(value);
}

async function fetchJson(url: string, timeoutMs: number): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        // A Caixa recusa clientes sem user-agent de navegador.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
    });

    clearTimeout(timeout);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function toNumbers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
    .sort((a, b) => a - b);
}

interface NormalizedDraw {
  lottery: Lottery;
  concurso: number;
  data: string;
  dezenas: number[];
  dezenas2: number[] | null;
  mesSorte: string | null;
  trevos: number[] | null;
  acumulou: boolean;
  premiacoes: unknown;
  estimativaProximoPremio: number;
  valorAcumuladoProximoConcurso: number;
  dataProximoConcurso: string | null;
}

function normalize(lottery: Lottery, raw: any): NormalizedDraw | null {
  const concurso = Number(raw?.numero ?? raw?.concurso);
  if (!Number.isFinite(concurso)) return null;

  const brutas = raw?.listaDezenas ?? raw?.dezenas;

  let dezenas: number[];
  let dezenas2: number[] | null = null;

  // A Dupla Sena devolve os dois sorteios concatenados num array de 12.
  if (lottery === "duplasena" && Array.isArray(brutas) && brutas.length >= 12) {
    const numeros = brutas.map((item: unknown) => Number(item));
    const metade = Math.floor(numeros.length / 2);
    dezenas = numeros.slice(0, metade).sort((a, b) => a - b);
    dezenas2 = numeros.slice(metade).sort((a, b) => a - b);
  } else {
    dezenas = toNumbers(brutas);
    const segundo = toNumbers(raw?.dezenasSegundoSorteio ?? raw?.listaDezenasSegundoSorteio);
    dezenas2 = segundo.length > 0 ? segundo : null;
  }

  if (dezenas.length === 0) return null;

  const trevos = toNumbers(raw?.trevos ?? raw?.trevosSorteados);

  return {
    lottery,
    concurso,
    data: String(raw?.dataApuracao ?? raw?.data ?? ""),
    dezenas,
    dezenas2,
    mesSorte: raw?.mesSorte ? String(raw.mesSorte) : null,
    trevos: trevos.length > 0 ? trevos : null,
    acumulou: Boolean(raw?.acumulou ?? raw?.acumulado),
    premiacoes: raw?.premiacoes ?? raw?.listaRateioPremio ?? null,
    estimativaProximoPremio: Number(
      raw?.valorEstimadoProximoConcurso ?? raw?.estimativaProximoPremio ?? 0,
    ),
    valorAcumuladoProximoConcurso: Number(raw?.valorAcumuladoProximoConcurso ?? 0),
    dataProximoConcurso: raw?.dataProximoConcurso ? String(raw.dataProximoConcurso) : null,
  };
}

function premioDoPayload(payload: unknown): {
  estimativaProximoPremio?: number;
  valorAcumuladoProximoConcurso?: number;
  dataProximoConcurso?: string;
} {
  if (!payload || typeof payload !== "object") return {};
  const dados = payload as Record<string, unknown>;
  return {
    estimativaProximoPremio: Number(dados.estimativaProximoPremio ?? 0) || undefined,
    valorAcumuladoProximoConcurso: Number(dados.valorAcumuladoProximoConcurso ?? 0) || undefined,
    dataProximoConcurso:
      typeof dados.dataProximoConcurso === "string" ? dados.dataProximoConcurso : undefined,
  };
}

function concursoPublico(registro: {
  concurso: number;
  data: string;
  dezenas: unknown;
  dezenas2: unknown;
  mesSorte: string | null;
  trevos: unknown;
  acumulou: boolean;
  premiacoes: unknown;
  payload: unknown;
}) {
  const premio = premioDoPayload(registro.payload);
  return {
    concurso: registro.concurso,
    data: registro.data,
    dezenas: registro.dezenas,
    dezenasSegundoSorteio: registro.dezenas2 ?? undefined,
    mesSorte: registro.mesSorte ?? undefined,
    trevos: registro.trevos ?? undefined,
    acumulou: registro.acumulou,
    premiacoes: registro.premiacoes ?? undefined,
    valorEstimadoProximoConcurso: premio.estimativaProximoPremio,
    valorAcumuladoProximoConcurso: premio.valorAcumuladoProximoConcurso,
    dataProximoConcurso: premio.dataProximoConcurso,
  };
}

async function persistDraws(draws: NormalizedDraw[]): Promise<void> {
  for (const draw of draws) {
    await prisma.lotteryDrawCache.upsert({
      where: { lottery_concurso: { lottery: draw.lottery, concurso: draw.concurso } },
      create: {
        lottery: draw.lottery,
        concurso: draw.concurso,
        data: draw.data,
        dezenas: draw.dezenas,
        dezenas2: draw.dezenas2 ?? undefined,
        mesSorte: draw.mesSorte,
        trevos: draw.trevos ?? undefined,
        acumulou: draw.acumulou,
        premiacoes: (draw.premiacoes as any) ?? undefined,
        payload: {
          estimativaProximoPremio: draw.estimativaProximoPremio,
          valorAcumuladoProximoConcurso: draw.valorAcumuladoProximoConcurso,
          dataProximoConcurso: draw.dataProximoConcurso,
        },
      },
      update: {
        data: draw.data,
        dezenas: draw.dezenas,
        dezenas2: draw.dezenas2 ?? undefined,
        mesSorte: draw.mesSorte,
        trevos: draw.trevos ?? undefined,
        acumulou: draw.acumulou,
        premiacoes: (draw.premiacoes as any) ?? undefined,
        payload: {
          estimativaProximoPremio: draw.estimativaProximoPremio,
          valorAcumuladoProximoConcurso: draw.valorAcumuladoProximoConcurso,
          dataProximoConcurso: draw.dataProximoConcurso,
        },
      },
    });
  }
}

/**
 * Sincroniza a modalidade com a fonte externa.
 * Na primeira vez traz o histórico inteiro do espelho; depois só completa os
 * concursos que faltam, para não castigar a origem a cada visita.
 */
async function refreshLottery(lottery: Lottery, app: FastifyInstance): Promise<void> {
  const agora = Date.now();
  const anterior = ultimaAtualizacao.get(lottery) ?? 0;
  if (agora - anterior < REFRESH_INTERVAL_MS) return;

  const total = await prisma.lotteryDrawCache.count({ where: { lottery } });

  if (total === 0) {
    const historico = await fetchJson(`${MIRROR_BASE}/${lottery}`, 60_000);
    if (Array.isArray(historico)) {
      const draws = historico
        .map((raw) => normalize(lottery, raw))
        .filter((draw): draw is NormalizedDraw => draw !== null);
      await persistDraws(draws);
      ultimaAtualizacao.set(lottery, Date.now());
      app.log.info(`[loterias] carga inicial de ${lottery}: ${draws.length} concursos`);
      return;
    }
  }

  const ultimo =
    (await fetchJson(`${CAIXA_BASE}/${lottery}`, 8000)) ??
    (await fetchJson(`${MIRROR_BASE}/${lottery}/latest`, 10_000));

  const draw = ultimo ? normalize(lottery, ultimo) : null;
  if (!draw) return;

  const maisRecente = await prisma.lotteryDrawCache.findFirst({
    where: { lottery },
    orderBy: { concurso: "desc" },
  });

  const conhecido = maisRecente?.concurso ?? 0;
  const pendentes: NormalizedDraw[] = [draw];

  // Busca individualmente os concursos que saíram desde a última sincronização.
  for (let concurso = conhecido + 1; concurso < draw.concurso; concurso++) {
    const bruto =
      (await fetchJson(`${CAIXA_BASE}/${lottery}/${concurso}`, 8000)) ??
      (await fetchJson(`${MIRROR_BASE}/${lottery}/${concurso}`, 10_000));
    const normalizado = bruto ? normalize(lottery, bruto) : null;
    if (normalizado) pendentes.push(normalizado);
  }

  await persistDraws(pendentes);
  ultimaAtualizacao.set(lottery, Date.now());
}

export async function lotteryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/lottery/:lottery/history", async (request, reply) => {
    const { lottery } = request.params as { lottery: string };
    if (!isLottery(lottery)) {
      return reply.code(404).send({ message: "Modalidade desconhecida" });
    }

    const parsed = historyQuerySchema.safeParse(request.query);
    const limit = parsed.success ? (parsed.data.limit ?? 1000) : 1000;

    // Espera a sincronização do concurso do dia. Se a fonte externa travar,
    // responde com o cache em vez de deixar a Carteira no concurso antigo.
    await Promise.race([
      refreshLottery(lottery, app).catch((error) => app.log.warn(error)),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);

    const registros = await prisma.lotteryDrawCache.findMany({
      where: { lottery },
      orderBy: { concurso: "desc" },
      take: limit,
    });

    return reply
      .header("Cache-Control", "public, max-age=60")
      .send({
        lottery,
        total: registros.length,
        draws: registros.map(concursoPublico),
      });
  });

  app.get("/lottery/:lottery/latest", async (request, reply) => {
    const { lottery } = request.params as { lottery: string };
    if (!isLottery(lottery)) {
      return reply.code(404).send({ message: "Modalidade desconhecida" });
    }

    await refreshLottery(lottery, app).catch((error) => app.log.warn(error));

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
      const bruto =
        (await fetchJson(`${CAIXA_BASE}/${lottery}/${numero}`, 8000)) ??
        (await fetchJson(`${MIRROR_BASE}/${lottery}/${numero}`, 10_000));
      const normalizado = bruto ? normalize(lottery, bruto) : null;

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

    await prisma.$transaction([
      prisma.lotteryWalletGame.deleteMany({
        where: { userId, id: { notIn: Array.from(enviados) } },
      }),
      ...games.map((game) => {
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
          update: dados,
        });
      }),
    ]);

    return { synced: games.length };
  });
}
