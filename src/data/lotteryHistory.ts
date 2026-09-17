import { LotteryDraw, LotteryType } from '@/types/lottery';

/**
 * Base histórica embarcada no bundle.
 *
 * São ~5.000 concursos reais da Caixa gerados por
 * `scripts/fetch-lottery-history.mjs`. Cada modalidade é carregada sob demanda
 * (import dinâmico) para não penalizar quem abre o app em apenas uma delas.
 *
 * Esta base é o último elo da cadeia de fallback: garante que as estatísticas
 * continuem válidas mesmo com o usuário offline ou com a API da Caixa fora do ar.
 */

interface EncodedHistoryFile {
  lottery: string;
  generatedAt: string;
  total: number;
  firstConcurso: number;
  lastConcurso: number;
  /** `concurso|data|dezenas[|extra]` — ver script de geração. */
  draws: string[];
}

const LOADERS: Record<LotteryType, () => Promise<{ default: EncodedHistoryFile }>> = {
  megasena: () => import('./history/megasena.json'),
  lotofacil: () => import('./history/lotofacil.json'),
  quina: () => import('./history/quina.json'),
  duplasena: () => import('./history/duplasena.json'),
  diadesorte: () => import('./history/diadesorte.json'),
  maismilionaria: () => import('./history/maismilionaria.json'),
};

const memoryCache = new Map<LotteryType, LotteryDraw[]>();

function parseNumberList(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export function decodeDraw(lottery: LotteryType, encoded: string): LotteryDraw | null {
  const [concursoRaw, data, dezenasRaw, extraRaw] = encoded.split('|');
  const concurso = Number(concursoRaw);
  const dezenas = parseNumberList(dezenasRaw);

  if (!Number.isFinite(concurso) || dezenas.length === 0) return null;

  const draw: LotteryDraw = {
    loteria: lottery,
    concurso,
    data: data ?? '',
    dezenas,
    // A base embarcada guarda apenas o essencial para estatística; campos de
    // premiação vêm das fontes ao vivo quando disponíveis.
    acumulou: false,
  };

  if (extraRaw) {
    if (lottery === 'duplasena') draw.dezenasSegundoSorteio = parseNumberList(extraRaw);
    else if (lottery === 'diadesorte') draw.mesSorte = extraRaw;
    else if (lottery === 'maismilionaria') draw.trevos = parseNumberList(extraRaw);
  }

  return draw;
}

/** Carrega a base embarcada da modalidade, ordenada do concurso mais recente ao mais antigo. */
export async function loadEmbeddedHistory(lottery: LotteryType): Promise<LotteryDraw[]> {
  const cached = memoryCache.get(lottery);
  if (cached) return cached;

  try {
    const module = await LOADERS[lottery]();
    const file = module.default;

    const draws = file.draws
      .map((encoded) => decodeDraw(lottery, encoded))
      .filter((draw): draw is LotteryDraw => draw !== null)
      .sort((a, b) => b.concurso - a.concurso);

    memoryCache.set(lottery, draws);
    return draws;
  } catch {
    return [];
  }
}
