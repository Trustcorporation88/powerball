import { LotteryDraw, LotteryType } from '@/types/lottery';
import { INITIAL_DRAWS } from './lotteryHistoricalData';

// Cache em memória e localStorage para persistência e performance máxima
const STORAGE_KEY_PREFIX = 'caixa_lottery_draws_';

export async function fetchLatestCaixaDraw(lottery: LotteryType): Promise<LotteryDraw> {
  const localCache = getCachedDraws(lottery);

  try {
    // 1. Tenta API pública da Caixa (com timeout rápido para não travar a UX se offline)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`https://servicebus2.caixa.gov.br/portaldeloterias/api/${lottery}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const parsedDraw: LotteryDraw = {
        loteria: lottery,
        concurso: Number(data.numero || data.concurso),
        data: data.dataApuracao || data.data || new Date().toLocaleDateString('pt-BR'),
        local: data.localSorteio || data.nomeMunicipioUFSorteio,
        dezenas: (data.listaDezenas || data.dezenas || []).map((d: string | number) => Number(d)),
        dezenasOrdemSorteio: (data.listaDezenasSegundoSorteio || data.dezenasOrdemSorteio || []).map((d: string | number) => Number(d)),
        acumulou: Boolean(data.acumulado),
        valorAcumuladoProximoConcurso: Number(data.valorAcumuladoProximoConcurso || 0),
        dataProximoConcurso: data.dataProximoConcurso,
        estimativaProximoPremio: Number(data.valorEstimadoProximoConcurso || 0),
        arrecadacaoTotal: Number(data.valorArrecadado || 0),
        premiacoes: (data.listaRateioPremio || []).map((item: any) => ({
          descricao: item.descricaoFaixa || `${item.faixa} acertos`,
          faixa: item.faixa,
          ganhadores: item.numeroDeGanhadores,
          valorPremio: item.valorPremio,
        })),
      };

      if (parsedDraw.dezenas.length > 0) {
        saveDrawToCache(lottery, parsedDraw);
        return parsedDraw;
      }
    }
  } catch {
    // Falha silenciosa no fetch oficial -> prossegue para fallbacks
  }

  // Fallback 1: se já tivermos no cache local atualizado
  if (localCache && localCache.length > 0) {
    return localCache[0];
  }

  // Fallback 2: dados mock pré-carregados de alta qualidade
  return INITIAL_DRAWS[lottery][0];
}

export function getAllDraws(lottery: LotteryType): LotteryDraw[] {
  const cached = getCachedDraws(lottery);
  if (cached && cached.length > 0) {
    return cached;
  }
  return INITIAL_DRAWS[lottery];
}

export function getCachedDraws(lottery: LotteryType): LotteryDraw[] | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${lottery}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return null;
}

export function saveDrawToCache(lottery: LotteryType, newDraw: LotteryDraw) {
  try {
    const current = getCachedDraws(lottery) || INITIAL_DRAWS[lottery];
    // Evita duplicatas pelo número do concurso
    const filtered = current.filter((d) => d.concurso !== newDraw.concurso);
    const updated = [newDraw, ...filtered].sort((a, b) => b.concurso - a.concurso);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${lottery}`, JSON.stringify(updated));
  } catch {
    // LocalStorage indisponível ou quota excedida
  }
}
