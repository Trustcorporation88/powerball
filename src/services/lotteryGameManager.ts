import { GeneratedGame, LotteryDraw, LotteryType, UserSavedGame } from '@/types/lottery';

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

// Conferidor Automático de Jogos com base no Concurso
export function checkTicketAgainstDraw(
  gameNumbers: number[],
  draw: LotteryDraw
): {
  hits: number;
  hitNumbers: number[];
  isWinner: boolean;
  prizeLabel?: string;
} {
  const hitNumbers = gameNumbers.filter((n) => draw.dezenas.includes(n));
  const hits = hitNumbers.length;
  let isWinner = false;
  let prizeLabel: string | undefined;

  if (draw.loteria === 'lotofacil') {
    if (hits >= 11) {
      isWinner = true;
      prizeLabel = `${hits} acertos! Premiado`;
    }
  } else if (draw.loteria === 'megasena') {
    if (hits === 6) {
      isWinner = true;
      prizeLabel = 'SENA! (6 acertos)';
    } else if (hits === 5) {
      isWinner = true;
      prizeLabel = 'QUINA! (5 acertos)';
    } else if (hits === 4) {
      isWinner = true;
      prizeLabel = 'QUADRA! (4 acertos)';
    }
  }

  return { hits, hitNumbers, isWinner, prizeLabel };
}

// Exportador em formato texto para envio fácil no WhatsApp
export function formatGamesForWhatsApp(games: GeneratedGame[], title?: string): string {
  const lines: string[] = [];
  lines.push(`🍀 *PALPITES INTELIGENTES - LOTERIAS CAIXA*`);
  if (title) lines.push(`📌 *${title}*`);
  lines.push(`📅 Data: ${new Date().toLocaleDateString('pt-BR')}`);
  lines.push(`----------------------------------`);

  let totalCost = 0;
  games.forEach((game, idx) => {
    totalCost += game.cost;
    const formattedNums = game.numbers
      .map((n) => String(n).padStart(2, '0'))
      .join(' - ');
    lines.push(
      `Jogo ${idx + 1} (${game.score} pts): ${formattedNums} [R$ ${game.cost.toFixed(2)}]`
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
  rows.push('ID;Loteria;Estrategia;Score;Dezenas;Custo;CriadoEm');

  games.forEach((g) => {
    const nums = g.numbers.map((n) => String(n).padStart(2, '0')).join(' ');
    rows.push(
      `"${g.id}";"${g.lottery}";"${g.strategyLabel}";"${g.score}";"${nums}";"${g.cost.toFixed(2)}";"${g.createdAt}"`
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
