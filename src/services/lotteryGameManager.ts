import {
  GeneratedGame,
  LotteryDraw,
  LotteryExtraSelection,
  LotteryType,
  UserSavedGame,
} from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';

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

  const userGame: UserSavedGame = {
    ...game,
    notes: notes || (existingIdx >= 0 ? current[existingIdx].notes : undefined),
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
  } catch {}
}

export function toggleBetStatus(gameId: string): boolean {
  const current = getSavedGames();
  const idx = current.findIndex((g) => g.id === gameId);
  if (idx >= 0) {
    current[idx].isBet = !current[idx].isBet;
    try {
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(current));
    } catch {}
    return !!current[idx].isBet;
  }
  return false;
}

export interface TicketCheckResult {
  hits: number;
  hitNumbers: number[];
  isWinner: boolean;
  prizeLabel?: string;
  /** Acertos no 2º sorteio da Dupla Sena. */
  secondDrawHits?: number;
  /** Acertou o Mês da Sorte / os trevos exigidos pela faixa. */
  extraHit?: boolean;
}

/**
 * Conferidor automático, guiado pelas faixas oficiais de cada modalidade.
 *
 * Na Dupla Sena o bilhete concorre nos dois sorteios e vale o melhor deles.
 * Na +Milionária a faixa depende também do número de trevos acertados, e no
 * Dia de Sorte o Mês da Sorte só muda a faixa máxima.
 */
export function checkTicketAgainstDraw(
  gameNumbers: number[],
  draw: LotteryDraw,
  extra?: LotteryExtraSelection,
): TicketCheckResult {
  const config = LOTTERY_CONFIGS[draw.loteria];

  const hitNumbers = gameNumbers.filter((n) => draw.dezenas.includes(n));
  let hits = hitNumbers.length;
  let secondDrawHits: number | undefined;

  if (config.hasSecondDraw && draw.dezenasSegundoSorteio?.length) {
    secondDrawHits = gameNumbers.filter((n) => draw.dezenasSegundoSorteio!.includes(n)).length;
    hits = Math.max(hits, secondDrawHits);
  }

  const trevosAcertados = extra?.trevos?.filter((t) => draw.trevos?.includes(t)).length ?? 0;
  const mesAcertado = Boolean(extra?.mesSorte && draw.mesSorte && extra.mesSorte === draw.mesSorte);
  const extraHit = config.extraField
    ? config.extraField.key === 'trevos'
      ? trevosAcertados > 0
      : mesAcertado
    : undefined;

  // A primeira faixa compatível é a de maior valor, já que prizeTiers vem
  // ordenada da melhor para a pior.
  const tier = config.prizeTiers.find((faixa) => {
    if (hits < faixa.hits) return false;
    if (faixa.trevos === undefined) return true;
    return trevosAcertados >= faixa.trevos;
  });

  return {
    hits,
    hitNumbers,
    isWinner: Boolean(tier),
    prizeLabel: tier ? `${tier.label} — premiado!` : undefined,
    secondDrawHits,
    extraHit,
  };
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
  lines.push(`💡 *Boa Sorte! Jogue com responsabilidade (+18)*`);

  return lines.join('\n');
}

// Exportador CSV para abrir direto no Excel / Google Sheets
export function exportGamesToCSV(games: GeneratedGame[], filename: string = 'apostas.csv') {
  const rows: string[] = [];
  rows.push('ID;Loteria;Estrategia;Score;Dezenas;Extra;Custo;CriadoEm');

  games.forEach((g) => {
    const nums = g.numbers.map((n) => String(n).padStart(2, '0')).join(' ');
    rows.push(
      `"${g.id}";"${LOTTERY_CONFIGS[g.lottery].name}";"${g.strategyLabel}";"${g.score}";"${nums}";"${describeExtra(g)}";"${g.cost.toFixed(2)}";"${g.createdAt}"`
    );
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
