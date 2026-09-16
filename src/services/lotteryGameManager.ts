import { GeneratedGame, LotteryDraw, LotteryType, UserSavedGame } from '@/types/lottery';

/**
 * Gerenciador de jogos salvos pelo usuário.
 * 
 * Funcionalidades:
 * - Salvar/remover jogos gerados
 * - Marcar jogos como apostados
 * - Conferir jogos contra sorteios
 * - Exportar jogos para WhatsApp e CSV
 */

const SAVED_GAMES_KEY = 'caixa_lottery_saved_games';

/**
 * Recupera todos os jogos salvos pelo usuário do localStorage.
 * @returns Array de jogos salvos
 */
export function getSavedGames(): UserSavedGame[] {
  try {
    const raw = localStorage.getItem(SAVED_GAMES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback para array vazio
  }
  return [];
}

/**
 * Salva ou atualiza um jogo na lista de jogos salvos.
 * 
 * @param game - Jogo gerado a ser salvo
 * @param notes - Notas opcionais do usuário
 * @returns O jogo salvo com notas
 */
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
    // quota excedida - ignorar silenciosamente
  }

  return userGame;
}

/**
 * Remove um jogo da lista de salvos.
 * @param gameId - ID único do jogo
 */
export function removeSavedGame(gameId: string) {
  const current = getSavedGames();
  const filtered = current.filter((g) => g.id !== gameId);
  try {
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(filtered));
  } catch {
    // ignorar erros de storage
  }
}

/**
 * Alterna o status de "apostado" de um jogo.
 * @param gameId - ID único do jogo
 * @returns Novo status de isBet
 */
export function toggleBetStatus(gameId: string): boolean {
  const current = getSavedGames();
  const idx = current.findIndex((g) => g.id === gameId);
  if (idx >= 0) {
    current[idx].isBet = !current[idx].isBet;
    try {
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(current));
    } catch {
      // ignorar erros de storage
    }
    return !!current[idx].isBet;
  }
  return false;
}

/**
 * Confere um jogo contra um sorteio realizado.
 * 
 * IMPORTANTE: Esta função apenas verifica acertos.
 * Ela NÃO valida se o bilhete foi realmente apostado na Caixa.
 * 
 * @param gameNumbers - Números do jogo a conferir
 * @param draw - Dados do sorteio realizado
 * @returns Resultado da conferência
 */
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

  // Regras de premiação conforme regulamento da Caixa
  if (draw.loteria === 'lotofacil') {
    // Lotofácil: premia de 11 a 15 acertos
    if (hits >= 11) {
      isWinner = true;
      prizeLabel = `${hits} acertos! Premiado`;
    }
  } else if (draw.loteria === 'megasena') {
    // Mega-Sena: premia quadra, quina e sena
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

/**
 * Formata jogos para compartilhamento via WhatsApp.
 * 
 * @param games - Array de jogos a formatar
 * @param title - Título opcional para a mensagem
 * @returns Texto formatado pronto para colar no WhatsApp
 */
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
  lines.push(``);
  lines.push(`⚠️ *AVISO:* Loterias são jogos de azar.`);
  lines.push(`Padrões históricos NÃO garantem resultados.`);
  lines.push(`💡 *Jogue com responsabilidade! (+18)*`);

  return lines.join('\n');
}

/**
 * Exporta jogos para formato CSV (compatível com Excel/Google Sheets).
 * 
 * @param games - Array de jogos a exportar
 * @param filename - Nome do arquivo (sem extensão)
 */
export function exportGamesToCSV(games: GeneratedGame[], filename: string = 'palpites_loteria'): void {
  // Cabeçalho do CSV
  const headers = [
    'Jogo',
    'Loteria',
    'Estratégia',
    'Números',
    'Quantidade',
    'Score',
    'Custo (R$)',
    'Data Geração',
  ];

  // Linhas de dados
  const rows = games.map((game, idx) => [
    idx + 1,
    game.lottery,
    game.strategy,
    game.numbers.map((n) => String(n).padStart(2, '0')).join(' - '),
    game.numbers.length,
    game.score,
    game.cost.toFixed(2).replace('.', ','),
    new Date(game.createdAt).toLocaleDateString('pt-BR'),
  ]);

  // Monta o CSV com BOM para UTF-8
  const csvContent =
    '\uFEFF' +
    [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');

  // Cria e dispara o download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
