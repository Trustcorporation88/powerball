import {
  GeneratedGame,
  LotteryDraw,
  LotteryExtraSelection,
  LotteryType,
  UserSavedGame,
} from '@/types/lottery';
import { combinations, LOTTERY_CONFIGS } from '@/constants/lotteryConstants';

const SAVED_GAMES_KEY = 'caixa_lottery_saved_games';

export function getSavedGames(): UserSavedGame[] {
  try {
    const raw = localStorage.getItem(SAVED_GAMES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return [];
}

export function saveGame(game: GeneratedGame, notes?: string): UserSavedGame {
  const current = getSavedGames();
  const existingIdx = current.findIndex((g) => g.id === game.id);

  const existing = existingIdx >= 0 ? current[existingIdx] : undefined;

  // Regravar o mesmo bilhete (ex.: reenviar no WhatsApp) não pode apagar a
  // marcação de apostado, o concurso-alvo nem a conferência já feita.
  const userGame: UserSavedGame = {
    ...existing,
    ...game,
    isBet: game.isBet ?? existing?.isBet,
    concursoAlvo: game.concursoAlvo ?? existing?.concursoAlvo,
    notes: notes || existing?.notes,
  };

  let updated: UserSavedGame[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = userGame;
  } else {
    updated = [userGame, ...current];
  }

  try {
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(updated));
  } catch {
    // quota
  }

  return userGame;
}

/** Substitui a carteira inteira. Usado pela sincronização com a nuvem. */
export function replaceSavedGames(games: UserSavedGame[]): void {
  try {
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(games));
  } catch {
    // quota
  }
}

export function removeSavedGame(gameId: string) {
  const current = getSavedGames();
  const filtered = current.filter((g) => g.id !== gameId);
  try {
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(filtered));
  } catch {
    // Storage cheio ou bloqueado: a remoção vale só nesta sessão.
  }
}

/** Troca o concurso de um bilhete e descarta a conferência feita para o anterior. */
export function setConcursoAlvo(gameId: string, concurso: number): UserSavedGame[] {
  const current = getSavedGames().map((game) =>
    game.id === gameId ? { ...game, concursoAlvo: concurso, checkResult: undefined } : game,
  );
  replaceSavedGames(current);
  return current;
}

export function setConcursoAlvoEmLote(gameIds: string[], concurso: number): UserSavedGame[] {
  const alvos = new Set(gameIds);
  const current = getSavedGames().map((game) =>
    alvos.has(game.id) ? { ...game, concursoAlvo: concurso, checkResult: undefined } : game,
  );
  replaceSavedGames(current);
  return current;
}

export function toggleBetStatus(gameId: string): boolean {
  const current = getSavedGames();
  const idx = current.findIndex((g) => g.id === gameId);
  if (idx >= 0) {
    current[idx].isBet = !current[idx].isBet;
    try {
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(current));
    } catch {
      // Storage cheio ou bloqueado: a marcação vale só nesta sessão.
    }
    return !!current[idx].isBet;
  }
  return false;
}

export const MES_DA_SORTE_LABEL = 'Mês da Sorte';

/** Uma faixa atingida e quantas apostas simples do bilhete caíram nela. */
export interface FaixaAtingida {
  /** Posição da faixa em `prizeTiers`; ausente para o Mês da Sorte. */
  tier?: number;
  label: string;
  quantidade: number;
  /** Dupla Sena: 1º ou 2º sorteio. */
  sorteio?: 1 | 2;
  mesSorte?: boolean;
}

export interface TicketCheckResult {
  hits: number;
  hitNumbers: number[];
  isWinner: boolean;
  prizeLabel?: string;
  /** Acertos no 2º sorteio da Dupla Sena. */
  secondDrawHits?: number;
  /** Acertou o Mês da Sorte / algum trevo. */
  extraHit?: boolean;
  faixas: FaixaAtingida[];
}

function normalizarMes(mes: string): string {
  return mes.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

/**
 * Conferidor guiado pelas regras oficiais de cada modalidade.
 *
 * Um bilhete com mais dezenas que o mínimo equivale a todas as apostas
 * simples que ele contém, e cada uma é premiada (Lotofácil de 16 dezenas
 * com 15 acertos = 1 prêmio de 15 + 15 prêmios de 14). Por isso a conta é
 * feita por aposta simples: C(acertos, j) × C(erros, mínimo − j) apostas
 * fazem exatamente j pontos.
 *
 * - Dupla Sena: o bilhete concorre nos dois sorteios e pode ganhar nos dois.
 * - +Milionária: cada aposta simples leva 2 dos trevos marcados; a faixa
 *   depende de quantos desses 2 saíram.
 * - Dia de Sorte: o Mês da Sorte é a 5ª faixa, independente das dezenas e
 *   cumulativa com elas (Portaria SPA/MF nº 2.755/2026).
 */
export function checkTicketAgainstDraw(
  gameNumbers: number[],
  draw: LotteryDraw,
  extra?: LotteryExtraSelection,
): TicketCheckResult {
  const config = LOTTERY_CONFIGS[draw.loteria];
  const porAposta = config.minSelection;
  const marcadas = gameNumbers.length;

  const hitNumbers = gameNumbers.filter((n) => draw.dezenas.includes(n));
  let hits = hitNumbers.length;
  let secondDrawHits: number | undefined;
  const segundo = config.hasSecondDraw && draw.dezenasSegundoSorteio?.length ? draw.dezenasSegundoSorteio : null;
  if (segundo) {
    secondDrawHits = gameNumbers.filter((n) => segundo.includes(n)).length;
    hits = Math.max(hits, secondDrawHits);
  }

  // Combinações de trevos por aposta simples, agrupadas por trevos acertados.
  const trevosMarcados = extra?.trevos?.length ?? 0;
  const trevosAcertados = extra?.trevos?.filter((t) => draw.trevos?.includes(t)).length ?? 0;
  const combinacoesDeTrevos: Array<{ acertos: number; quantidade: number }> =
    config.extraField?.key === 'trevos' && trevosMarcados >= 2
      ? [2, 1, 0].map((acertos) => ({
          acertos,
          quantidade:
            combinations(trevosAcertados, acertos) *
            combinations(trevosMarcados - trevosAcertados, 2 - acertos),
        }))
      : [{ acertos: 0, quantidade: 1 }];

  const faixas: FaixaAtingida[] = [];
  const conferirSorteio = (acertos: number, sorteio?: 1 | 2) => {
    for (let j = Math.min(acertos, porAposta); j >= 0; j--) {
      const apostas = combinations(acertos, j) * combinations(marcadas - acertos, porAposta - j);
      if (apostas === 0) continue;
      for (const trevos of combinacoesDeTrevos) {
        if (trevos.quantidade === 0) continue;
        const tier = config.prizeTiers.findIndex(
          (faixa) => faixa.hits === j && (faixa.trevos === undefined || trevos.acertos >= faixa.trevos),
        );
        if (tier < 0) continue;
        const existente = faixas.find((f) => f.tier === tier && f.sorteio === sorteio);
        const quantidade = apostas * trevos.quantidade;
        if (existente) existente.quantidade += quantidade;
        else faixas.push({ tier, label: config.prizeTiers[tier].label, quantidade, sorteio });
      }
    }
  };

  conferirSorteio(hitNumbers.length, segundo ? 1 : undefined);
  if (segundo) conferirSorteio(secondDrawHits ?? 0, 2);

  const mesAcertado = Boolean(
    extra?.mesSorte && draw.mesSorte && normalizarMes(extra.mesSorte) === normalizarMes(draw.mesSorte),
  );
  if (config.extraField?.key === 'mesSorte' && mesAcertado) {
    faixas.push({ label: MES_DA_SORTE_LABEL, quantidade: combinations(marcadas, porAposta), mesSorte: true });
  }

  faixas.sort((a, b) => (a.tier ?? Infinity) - (b.tier ?? Infinity) || (a.sorteio ?? 0) - (b.sorteio ?? 0));

  const extraHit = config.extraField
    ? config.extraField.key === 'trevos'
      ? trevosAcertados > 0
      : mesAcertado
    : undefined;

  return {
    hits,
    hitNumbers,
    isWinner: faixas.length > 0,
    prizeLabel: faixas.length > 0 ? `${descreverFaixas(faixas)} — premiado!` : undefined,
    secondDrawHits,
    extraHit,
    faixas,
  };
}

export function descreverFaixas(faixas: FaixaAtingida[]): string {
  return faixas
    .map((faixa) => {
      const quantidade = faixa.quantidade > 1 ? `${faixa.quantidade}× ` : '';
      const sorteio = faixa.sorteio ? ` (${faixa.sorteio}º sorteio)` : '';
      return `${quantidade}${faixa.label}${sorteio}`;
    })
    .join(' + ');
}

/** Descreve o campo extra do bilhete para exportações e listagens. */
export function describeExtra(game: GeneratedGame): string {
  if (game.extra?.mesSorte) return `Mês da Sorte: ${game.extra.mesSorte}`;
  if (game.extra?.trevos?.length) return `Trevos: ${game.extra.trevos.join(' e ')}`;
  return '';
}

// Exportador em formato texto para envio fácil no WhatsApp
export function formatGamesForWhatsApp(games: GeneratedGame[], title?: string): string {
  const lines: string[] = [];
  const modalidade = games[0] ? LOTTERY_CONFIGS[games[0].lottery].name : 'Loterias Caixa';

  lines.push(`🍀 *PALPITES INTELIGENTES — ${modalidade.toUpperCase()}*`);
  if (title) lines.push(`📌 *${title}*`);
  lines.push(`📅 Data: ${new Date().toLocaleDateString('pt-BR')}`);
  lines.push(`----------------------------------`);

  let totalCost = 0;
  games.forEach((game, idx) => {
    totalCost += game.cost;
    const formattedNums = game.numbers
      .map((n) => String(n).padStart(2, '0'))
      .join(' - ');
    const extra = describeExtra(game);
    lines.push(
      `Jogo ${idx + 1} (${game.score} pts): ${formattedNums} [R$ ${game.cost.toFixed(2)}]${extra ? `\n   ${extra}` : ''}`
    );
  });

  lines.push(`----------------------------------`);
  lines.push(`💰 Custo Total das Apostas: R$ ${totalCost.toFixed(2)}`);
  lines.push(``);
  lines.push(`⚠️ *AVISO:* Loterias são jogos de azar.`);
  lines.push(`Padrões históricos NÃO garantem resultados.`);
  lines.push(`💡 *Jogue com responsabilidade! (+18)*`);

  return lines.join('\n');
}

// Exportador CSV para abrir direto no Excel / Google Sheets
export function exportGamesToCSV(games: GeneratedGame[], filename: string = 'apostas.csv') {
  const rows: string[] = [];
  rows.push('ID;Loteria;Estrategia;Score;Dezenas;Extra;Custo;CriadoEm');

  games.forEach((g) => {
    const nums = g.numbers.map((n) => String(n).padStart(2, '0')).join(' ');
    rows.push(
      `"${g.id}";"${LOTTERY_CONFIGS[g.lottery].name}";"${g.strategyLabel}";"${g.score}";"${nums}";"${describeExtra(g)}";"${g.cost.toFixed(2).replace('.', ',')}";"${g.createdAt}"`
    );
  });

  // Blob em vez de data URI: carteiras grandes estouram o limite de tamanho da
  // URL em alguns navegadores. O BOM mantém os acentos corretos no Excel.
  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
