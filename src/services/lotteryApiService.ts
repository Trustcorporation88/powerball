import { LotteryDraw, LotteryType } from '@/types/lottery';
import { INITIAL_DRAWS } from './lotteryHistoricalData';

/**
 * Serviço de API para obter resultados de loterias da Caixa.
 * 
 * FONTES DE DADOS (em ordem de prioridade):
 * 1. API oficial da Caixa: https://servicebus2.caixa.gov.br/portaldeloterias/api/
 * 2. Cache local (localStorage) para acesso offline
 * 3. Dados históricos pré-carregados (fallback)
 * 
 * ESTRATÉGIA DE CACHE:
 * - Resultados são salvos no localStorage após cada fetch bem-sucedido
 * - O cache é atualizado apenas quando um novo concurso é detectado
 * - Evita duplicatas pelo número do concurso
 * - Ordenado do mais recente para o mais antigo
 */

// Prefixo das chaves de cache no localStorage
const STORAGE_KEY_PREFIX = 'caixa_lottery_draws_';

/**
 * Busca o sorteio mais recente da loteria especificada.
 * 
 * Fluxo:
 * 1. Tenta a API oficial da Caixa (timeout de 3.5s para não travar a UX)
 * 2. Se falhar, usa cache local
 * 3. Se não houver cache, usa dados pré-carregados
 * 
 * @param lottery - Tipo da loteria ('lotofacil' ou 'megasena')
 * @returns Dados do sorteio mais recente
 */
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
    // Isso pode ocorrer por: timeout, rede offline, API indisponível
  }

  // Fallback 1: cache local atualizado
  if (localCache && localCache.length > 0) {
    return localCache[0];
  }

  // Fallback 2: dados históricos pré-carregados
  return INITIAL_DRAWS[lottery][0];
}

/**
 * Retorna todos os sorteios disponíveis para uma loteria.
 * Usa cache local ou dados pré-carregados.
 * 
 * @param lottery - Tipo da loteria
 * @returns Array de sorteios ordenados do mais recente ao mais antigo
 */
export function getAllDraws(lottery: LotteryType): LotteryDraw[] {
  const cached = getCachedDraws(lottery);
  if (cached && cached.length > 0) {
    return cached;
  }
  return INITIAL_DRAWS[lottery];
}

/**
 * Recupera sorteios do cache local (localStorage).
 * 
 * @param lottery - Tipo da loteria
 * @returns Array de sorteios ou null se não houver cache
 */
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
    // localStorage indisponível ou dados corrompidos
  }
  return null;
}

/**
 * Salva um novo sorteio no cache local.
 * Evita duplicatas e mantém ordenação por concurso (decrescente).
 * 
 * @param lottery - Tipo da loteria
 * @param newDraw - Dados do novo sorteio
 */
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
