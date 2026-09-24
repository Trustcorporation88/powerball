import { LotteryDraw, LotteryType } from '@/types/lottery';
import { loadEmbeddedHistory } from '@/data/lotteryHistory';
import { API_URL } from '@/services/apiClient';

/**
 * Camada de dados das loterias da Caixa.
 *
 * CADEIA DE FONTES (a primeira que responder vence, e as demais viram fallback):
 *
 * 1. Proxy próprio (`VITE_API_URL`) — servidor Fastify no Railway com cache em
 *    Postgres. É a fonte preferida porque não depende do IP do visitante nem
 *    sofre com CORS.
 * 2. API oficial da Caixa — funciona direto do navegador do usuário, mas é
 *    instável a partir de datacenters (responde 403) e não expõe CORS formal.
 * 3. Espelho público comunitário — cobre todas as modalidades no mesmo formato.
 * 4. Base histórica embarcada — ~5.000 concursos reais dentro do bundle.
 *
 * O histórico embarcado é sempre carregado primeiro para que a tela pinte
 * estatísticas confiáveis de imediato; as fontes ao vivo apenas completam os
 * concursos mais recentes.
 */

const STORAGE_KEY_PREFIX = 'caixa_lottery_draws_v2_';

/** Quantos concursos recentes guardamos no localStorage (o resto vem do bundle). */
const LIVE_CACHE_SIZE = 250;

/** Teto de requisições para preencher buracos entre o bundle e o concurso atual. */
const MAX_GAP_FETCHES = 25;

const CAIXA_BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api';
const MIRROR_BASE = 'https://loteriascaixa-api.herokuapp.com/api';

export type LotterySource = 'proxy' | 'caixa' | 'mirror' | 'cache' | 'embedded';

export interface LotteryHistory {
  lottery: LotteryType;
  draws: LotteryDraw[];
  source: LotterySource;
  lastUpdated: string;
}

/* ------------------------------------------------------------------ *
 * Normalização
 * ------------------------------------------------------------------ */

function toNumbers(list: unknown): number[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
}

/** Converte o payload da Caixa/espelho (que compartilham o mesmo formato) em `LotteryDraw`. */
export function normalizeDraw(lottery: LotteryType, raw: Record<string, any>): LotteryDraw | null {
  const concurso = Number(raw.numero ?? raw.concurso);
  const brutas = raw.listaDezenas ?? raw.dezenas;

  // A Dupla Sena devolve os dois sorteios concatenados num array único
  // (6 dezenas do 1º, 6 do 2º). Separar antes de ordenar é obrigatório.
  let dezenas: number[];
  let segundoSorteioConcatenado: number[] = [];

  if (lottery === 'duplasena' && Array.isArray(brutas) && brutas.length >= 12) {
    const numeros = brutas.map((value: unknown) => Number(value));
    const metade = Math.floor(numeros.length / 2);
    dezenas = numeros.slice(0, metade).sort((a, b) => a - b);
    segundoSorteioConcatenado = numeros.slice(metade).sort((a, b) => a - b);
  } else {
    dezenas = toNumbers(brutas);
  }

  if (!Number.isFinite(concurso) || dezenas.length === 0) return null;

  const draw: LotteryDraw = {
    loteria: lottery,
    concurso,
    data: raw.dataApuracao ?? raw.data ?? '',
    local: raw.localSorteio ?? raw.local ?? raw.nomeMunicipioUFSorteio,
    dezenas,
    dezenasOrdemSorteio: toNumbers(raw.dezenasOrdemSorteio ?? raw.listaDezenasSorteadas),
    acumulou: Boolean(raw.acumulou ?? raw.acumulado),
    valorAcumuladoProximoConcurso: Number(raw.valorAcumuladoProximoConcurso ?? 0),
    dataProximoConcurso: raw.dataProximoConcurso,
    estimativaProximoPremio: Number(raw.valorEstimadoProximoConcurso ?? 0),
    arrecadacaoTotal: Number(raw.valorArrecadado ?? 0),
    premiacoes: Array.isArray(raw.premiacoes ?? raw.listaRateioPremio)
      ? (raw.premiacoes ?? raw.listaRateioPremio).map((item: any) => ({
          descricao: item.descricao ?? item.descricaoFaixa ?? `${item.faixa} acertos`,
          faixa: Number(item.faixa ?? 0),
          ganhadores: Number(item.ganhadores ?? item.numeroDeGanhadores ?? 0),
          valorPremio: Number(item.valorPremio ?? 0),
        }))
      : undefined,
  };

  const segundoSorteio =
    segundoSorteioConcatenado.length > 0
      ? segundoSorteioConcatenado
      : toNumbers(raw.dezenasSegundoSorteio ?? raw.listaDezenasSegundoSorteio);
  if (segundoSorteio.length > 0) draw.dezenasSegundoSorteio = segundoSorteio;

  const mesSorte = raw.mesSorte ?? raw.nomeTimeCoracaoMesSorte;
  if (mesSorte) draw.mesSorte = String(mesSorte);

  const trevos = toNumbers(raw.trevos ?? raw.trevosSorteados);
  if (trevos.length > 0) draw.trevos = trevos;

  return draw;
}

/* ------------------------------------------------------------------ *
 * Cache local
 * ------------------------------------------------------------------ */

export function getCachedDraws(lottery: LotteryType): LotteryDraw[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${lottery}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCachedDraws(lottery: LotteryType, draws: LotteryDraw[]): void {
  try {
    const recent = draws.slice(0, LIVE_CACHE_SIZE);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${lottery}`, JSON.stringify(recent));
  } catch {
    // localStorage indisponível ou sem quota — o app segue com o bundle.
  }
}

export function saveDrawToCache(lottery: LotteryType, newDraw: LotteryDraw): void {
  const current = getCachedDraws(lottery);
  saveCachedDraws(lottery, mergeDraws(current, [newDraw]));
}

/** Une listas de concursos removendo duplicatas e mantendo a ordem decrescente. */
export function mergeDraws(...lists: LotteryDraw[][]): LotteryDraw[] {
  const byConcurso = new Map<number, LotteryDraw>();

  for (const list of lists) {
    for (const draw of list) {
      const existing = byConcurso.get(draw.concurso);
      // Registros ao vivo trazem premiação e local; não deixamos o bundle
      // sobrescrever um registro mais rico.
      if (!existing || (!existing.premiacoes && draw.premiacoes)) {
        byConcurso.set(draw.concurso, existing ? { ...existing, ...draw } : draw);
      }
    }
  }

  return Array.from(byConcurso.values()).sort((a, b) => b.concurso - a.concurso);
}

/* ------------------------------------------------------------------ *
 * Fontes remotas
 * ------------------------------------------------------------------ */

async function fetchJson(url: string, timeoutMs: number): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeout);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** Histórico completo via proxy próprio — uma única requisição, já normalizada. */
async function fetchFromProxy(lottery: LotteryType, limit: number): Promise<LotteryDraw[]> {
  if (!API_URL) return [];

  const payload = await fetchJson(`${API_URL}/lottery/${lottery}/history?limit=${limit}`, 6000);
  if (!payload || !Array.isArray(payload.draws)) return [];

  return payload.draws
    .map((raw: Record<string, any>) => normalizeDraw(lottery, raw))
    .filter((draw: LotteryDraw | null): draw is LotteryDraw => draw !== null);
}

async function fetchLatestFromCaixa(lottery: LotteryType): Promise<LotteryDraw | null> {
  const payload = await fetchJson(`${CAIXA_BASE}/${lottery}`, 3500);
  return payload ? normalizeDraw(lottery, payload) : null;
}

async function fetchLatestFromMirror(lottery: LotteryType): Promise<LotteryDraw | null> {
  const payload = await fetchJson(`${MIRROR_BASE}/${lottery}/latest`, 5000);
  return payload ? normalizeDraw(lottery, payload) : null;
}

async function fetchConcurso(lottery: LotteryType, concurso: number): Promise<LotteryDraw | null> {
  const caixa = await fetchJson(`${CAIXA_BASE}/${lottery}/${concurso}`, 3500);
  if (caixa) {
    const draw = normalizeDraw(lottery, caixa);
    if (draw) return draw;
  }

  const mirror = await fetchJson(`${MIRROR_BASE}/${lottery}/${concurso}`, 5000);
  return mirror ? normalizeDraw(lottery, mirror) : null;
}

/* ------------------------------------------------------------------ *
 * API pública do serviço
 * ------------------------------------------------------------------ */

/**
 * Devolve o histórico da modalidade combinando base embarcada, cache local e
 * fontes ao vivo. Nunca lança: se tudo falhar, o bundle ainda responde.
 */
export async function getLotteryHistory(
  lottery: LotteryType,
  options: { skipNetwork?: boolean } = {},
): Promise<LotteryHistory> {
  const embedded = await loadEmbeddedHistory(lottery);
  const cached = getCachedDraws(lottery);

  let draws = mergeDraws(cached, embedded);
  let source: LotterySource = cached.length > 0 ? 'cache' : 'embedded';

  if (options.skipNetwork) {
    return { lottery, draws, source, lastUpdated: new Date().toISOString() };
  }

  const proxyDraws = await fetchFromProxy(lottery, 1000);
  if (proxyDraws.length > 0) {
    draws = mergeDraws(proxyDraws, draws);
    source = 'proxy';
  }

  // O proxy devolve o que está no banco. Se a sincronização atrasou, o
  // concurso da Carteira fica parado. A Caixa e o espelho, chamados daqui do
  // navegador, trazem o sorteio do dia e entram na frente do cache.
  const known = draws[0]?.concurso ?? 0;

  let latest = await fetchLatestFromCaixa(lottery);
  if (latest) source = 'caixa';

  if (!latest) {
    latest = await fetchLatestFromMirror(lottery);
    if (latest) source = 'mirror';
  }

  if (!latest) {
    return { lottery, draws, source, lastUpdated: new Date().toISOString() };
  }

  const novos: LotteryDraw[] = [latest];

  // Preenche os concursos que saíram enquanto o bundle envelhecia.
  const gap = latest.concurso - known - 1;
  if (gap > 0) {
    const total = Math.min(gap, MAX_GAP_FETCHES);
    for (let i = 1; i <= total; i++) {
      const draw = await fetchConcurso(lottery, latest.concurso - i);
      if (draw) novos.push(draw);
    }
  }

  draws = mergeDraws(novos, draws);
  saveCachedDraws(lottery, draws);

  return { lottery, draws, source, lastUpdated: new Date().toISOString() };
}

/** Compatibilidade: devolve apenas o concurso mais recente conhecido. */
export async function fetchLatestCaixaDraw(lottery: LotteryType): Promise<LotteryDraw> {
  const history = await getLotteryHistory(lottery);

  return (
    history.draws[0] ?? {
      loteria: lottery,
      concurso: 0,
      data: new Date().toLocaleDateString('pt-BR'),
      dezenas: [],
      acumulou: false,
    }
  );
}

/** Busca um concurso específico (usado pelas páginas públicas de resultado). */
export async function getDrawByConcurso(
  lottery: LotteryType,
  concurso: number,
): Promise<LotteryDraw | null> {
  const history = await getLotteryHistory(lottery, { skipNetwork: true });
  const local = history.draws.find((draw) => draw.concurso === concurso);
  if (local?.premiacoes) return local;

  const remote = await fetchConcurso(lottery, concurso);
  if (remote) {
    saveDrawToCache(lottery, remote);
    return remote;
  }

  return local ?? null;
}
