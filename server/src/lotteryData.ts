import type { FastifyBaseLogger } from "fastify";
import { prisma } from "./prisma.js";

/**
 * Busca, normalização e cache dos resultados das loterias da Caixa.
 *
 * A API oficial responde 403 para chamadas vindas de datacenters e não
 * publica cabeçalhos de CORS, então nem o servidor nem o navegador podem
 * depender só dela. Tentamos a Caixa primeiro e caímos para um espelho
 * público, gravando tudo em Postgres.
 */

export const LOTTERIES = [
  "megasena",
  "lotofacil",
  "quina",
  "duplasena",
  "diadesorte",
  "maismilionaria",
] as const;

export type Lottery = (typeof LOTTERIES)[number];

export const NOMES: Record<Lottery, string> = {
  megasena: "Mega-Sena",
  lotofacil: "Lotofácil",
  quina: "Quina",
  duplasena: "Dupla Sena",
  diadesorte: "Dia de Sorte",
  maismilionaria: "+Milionária",
};

/** Universo de dezenas e quantas saem por sorteio. */
export const UNIVERSO: Record<Lottery, { total: number; sorteadas: number; doisSorteios?: boolean }> = {
  megasena: { total: 60, sorteadas: 6 },
  lotofacil: { total: 25, sorteadas: 15 },
  quina: { total: 80, sorteadas: 5 },
  duplasena: { total: 50, sorteadas: 6, doisSorteios: true },
  diadesorte: { total: 31, sorteadas: 7 },
  maismilionaria: { total: 50, sorteadas: 6 },
};

const CAIXA_BASE = "https://servicebus2.caixa.gov.br/portaldeloterias/api";
const MIRROR_BASE = "https://loteriascaixa-api.herokuapp.com/api";

/** Tempo mínimo entre duas idas à fonte externa disparadas por visitas. */
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/** Teto de concursos buscados um a um numa sincronização. */
const MAX_GAP_FETCHES = 50;

/** Sem resposta de nenhuma fonte por este tempo, a modalidade entra em alerta. */
export const SEM_RESPOSTA_ALERTA_MS = 24 * 60 * 60 * 1000;

const LOG_RETENCAO_MS = 30 * 24 * 60 * 60 * 1000;

const ultimaAtualizacao = new Map<Lottery, number>();
const emAndamento = new Map<Lottery, Promise<SyncOutcome>>();

export function isLottery(value: string): value is Lottery {
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

export interface NormalizedDraw {
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

export function normalize(lottery: Lottery, raw: any): NormalizedDraw | null {
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

/**
 * Momento do sorteio a partir de "dd/mm/aaaa". Os sorteios são às 20h de
 * Brasília (23h UTC); um bilhete gravado depois disso já não vale para ele.
 */
export function momentoDoSorteio(data: string | null | undefined): number | null {
  const partes = String(data ?? "").split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes.map(Number);
  if (!dia || !mes || !ano) return null;
  return Date.UTC(ano, mes - 1, dia, 23, 0, 0);
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

export function concursoPublico(registro: {
  concurso: number;
  data: string;
  dezenas: unknown;
  dezenas2: unknown;
  mesSorte: string | null;
  trevos: unknown;
  acumulou: boolean;
  premiacoes: unknown;
  payload: unknown;
  updatedAt?: Date;
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
    atualizadoEm: registro.updatedAt?.toISOString(),
  };
}

export async function persistDraws(draws: NormalizedDraw[]): Promise<void> {
  for (const draw of draws) {
    const dados = {
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
    };

    await prisma.lotteryDrawCache.upsert({
      where: { lottery_concurso: { lottery: draw.lottery, concurso: draw.concurso } },
      create: { lottery: draw.lottery, concurso: draw.concurso, ...dados },
      update: dados,
    });
  }
}

/** Busca um concurso específico na Caixa e, se ela recusar, no espelho. */
export async function fetchConcurso(lottery: Lottery, concurso: number): Promise<NormalizedDraw | null> {
  const bruto =
    (await fetchJson(`${CAIXA_BASE}/${lottery}/${concurso}`, 8000)) ??
    (await fetchJson(`${MIRROR_BASE}/${lottery}/${concurso}`, 10_000));
  return bruto ? normalize(lottery, bruto) : null;
}

export interface SyncOutcome {
  lottery: Lottery;
  ok: boolean;
  source: "caixa" | "mirror" | null;
  latestConcurso: number | null;
  newDraws: number;
  error?: string;
}

async function registrarTentativa(inicio: Date, resultado: SyncOutcome): Promise<void> {
  await prisma.lotterySyncLog.create({
    data: {
      lottery: resultado.lottery,
      startedAt: inicio,
      finishedAt: new Date(),
      ok: resultado.ok,
      source: resultado.source,
      latestConcurso: resultado.latestConcurso,
      newDraws: resultado.newDraws,
      error: resultado.error?.slice(0, 500),
    },
  });
}

async function sincronizar(lottery: Lottery, log: FastifyBaseLogger): Promise<SyncOutcome> {
  const conhecidoAntes = await prisma.lotteryDrawCache.findFirst({
    where: { lottery },
    orderBy: { concurso: "desc" },
    select: { concurso: true },
  });

  // Banco vazio: carrega o histórico inteiro do espelho de uma vez.
  if (!conhecidoAntes) {
    const historico = await fetchJson(`${MIRROR_BASE}/${lottery}`, 60_000);
    if (Array.isArray(historico)) {
      const draws = historico
        .map((raw) => normalize(lottery, raw))
        .filter((draw): draw is NormalizedDraw => draw !== null);
      await persistDraws(draws);
      log.info(`[loterias] carga inicial de ${lottery}: ${draws.length} concursos`);
      const maior = draws.reduce((max, draw) => Math.max(max, draw.concurso), 0);
      return {
        lottery,
        ok: draws.length > 0,
        source: "mirror",
        latestConcurso: maior || null,
        newDraws: draws.length,
      };
    }
  }

  let source: SyncOutcome["source"] = null;
  let ultimo = await fetchJson(`${CAIXA_BASE}/${lottery}`, 8000);
  if (ultimo) {
    source = "caixa";
  } else {
    ultimo = await fetchJson(`${MIRROR_BASE}/${lottery}/latest`, 10_000);
    if (ultimo) source = "mirror";
  }

  const draw = ultimo ? normalize(lottery, ultimo) : null;
  if (!draw) {
    return {
      lottery,
      ok: false,
      source: null,
      latestConcurso: conhecidoAntes?.concurso ?? null,
      newDraws: 0,
      error: ultimo ? "Resposta da fonte em formato inesperado" : "Caixa e espelho não responderam",
    };
  }

  const conhecido = conhecidoAntes?.concurso ?? 0;
  const pendentes: NormalizedDraw[] = [draw];

  const inicioLacuna = Math.max(conhecido + 1, draw.concurso - MAX_GAP_FETCHES);
  for (let concurso = inicioLacuna; concurso < draw.concurso; concurso++) {
    const normalizado = await fetchConcurso(lottery, concurso);
    if (normalizado) pendentes.push(normalizado);
  }

  await persistDraws(pendentes);

  return {
    lottery,
    ok: true,
    source,
    latestConcurso: draw.concurso,
    newDraws: pendentes.filter((item) => item.concurso > conhecido).length,
  };
}

/**
 * Sincroniza a modalidade com a fonte externa e registra a tentativa.
 *
 * Visitas chamam sem `force` e respeitam o intervalo mínimo; o agendador
 * chama com `force`. Duas chamadas simultâneas compartilham a mesma ida à
 * fonte. Devolve `null` quando a chamada foi dispensada pelo intervalo.
 */
export async function refreshLottery(
  lottery: Lottery,
  log: FastifyBaseLogger,
  options: { force?: boolean } = {},
): Promise<SyncOutcome | null> {
  const atual = emAndamento.get(lottery);
  if (atual) return atual;

  const anterior = ultimaAtualizacao.get(lottery) ?? 0;
  if (!options.force && Date.now() - anterior < REFRESH_INTERVAL_MS) return null;

  const inicio = new Date();
  const tarefa = sincronizar(lottery, log)
    .catch(
      (error): SyncOutcome => ({
        lottery,
        ok: false,
        source: null,
        latestConcurso: null,
        newDraws: 0,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    .then(async (resultado) => {
      ultimaAtualizacao.set(lottery, Date.now());
      await registrarTentativa(inicio, resultado).catch((error) => log.warn(error));
      if (!resultado.ok) log.warn(`[loterias] ${lottery}: ${resultado.error}`);
      return resultado;
    })
    .finally(() => emAndamento.delete(lottery));

  emAndamento.set(lottery, tarefa);
  return tarefa;
}

export async function limparLogsAntigos(): Promise<void> {
  await prisma.lotterySyncLog.deleteMany({
    where: { startedAt: { lt: new Date(Date.now() - LOG_RETENCAO_MS) } },
  });
}

export interface StatusModalidade {
  lottery: Lottery;
  nome: string;
  ultimoConcurso: number | null;
  dataUltimoConcurso: string | null;
  dataProximoConcurso: string | null;
  ultimaSincronizacaoOk: string | null;
  fonteUltimaSincronizacao: string | null;
  ultimaTentativa: string | null;
  ultimoErro: string | null;
  /** Nenhuma fonte respondeu nas últimas 24h. */
  fonteSemResposta: boolean;
  /** A data do próximo sorteio passou e o resultado ainda não chegou. */
  resultadoAtrasado: boolean;
  alerta: string | null;
}

/** Tolerância entre o sorteio (20h) e a publicação do resultado. */
const PUBLICACAO_TOLERANCIA_MS = 6 * 60 * 60 * 1000;

export async function statusDasModalidades(agora = Date.now()): Promise<StatusModalidade[]> {
  return Promise.all(
    LOTTERIES.map(async (lottery) => {
      const [ok, tentativa, primeira, maisRecente] = await Promise.all([
        prisma.lotterySyncLog.findFirst({
          where: { lottery, ok: true },
          orderBy: { startedAt: "desc" },
        }),
        prisma.lotterySyncLog.findFirst({ where: { lottery }, orderBy: { startedAt: "desc" } }),
        prisma.lotterySyncLog.findFirst({ where: { lottery }, orderBy: { startedAt: "asc" } }),
        prisma.lotteryDrawCache.findFirst({ where: { lottery }, orderBy: { concurso: "desc" } }),
      ]);

      const dataProximo = premioDoPayload(maisRecente?.payload).dataProximoConcurso ?? null;
      const momentoProximo = momentoDoSorteio(dataProximo);

      // A janela conta da última resposta boa ou, sem nenhuma, da primeira
      // tentativa: uma falha isolada logo depois do deploy não é alerta.
      const referencia = ok?.finishedAt ?? primeira?.startedAt ?? null;
      const fonteSemResposta = Boolean(
        referencia && agora - referencia.getTime() > SEM_RESPOSTA_ALERTA_MS,
      );
      const resultadoAtrasado =
        momentoProximo !== null && agora > momentoProximo + PUBLICACAO_TOLERANCIA_MS;

      let alerta: string | null = null;
      if (fonteSemResposta) {
        alerta = ok
          ? `Nenhuma fonte responde desde ${ok.finishedAt.toISOString()}.`
          : "Nenhuma fonte respondeu desde que a API subiu.";
      } else if (resultadoAtrasado) {
        alerta = `O sorteio de ${dataProximo} já aconteceu e o resultado ainda não chegou.`;
      }

      return {
        lottery,
        nome: NOMES[lottery],
        ultimoConcurso: maisRecente?.concurso ?? null,
        dataUltimoConcurso: maisRecente?.data ?? null,
        dataProximoConcurso: dataProximo,
        ultimaSincronizacaoOk: ok?.finishedAt.toISOString() ?? null,
        fonteUltimaSincronizacao: ok?.source ?? null,
        ultimaTentativa: tentativa?.finishedAt.toISOString() ?? null,
        ultimoErro: tentativa && !tentativa.ok ? tentativa.error : null,
        fonteSemResposta,
        resultadoAtrasado,
        alerta,
      };
    }),
  );
}
