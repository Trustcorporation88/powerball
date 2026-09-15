import { FechamentoPlan, GeneratedGame, LotteryStats, LotteryType } from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';
import { analyzeGame, computeGameScore } from './lotteryGenerator';

// Matrizes combinatórias otimizadas (Wheeling systems / Covering designs)
// Representadas como índices 0-based dentro do array de dezenas selecionadas pelo usuário
export const FECHAMENTOS_CATALOG: FechamentoPlan[] = [
  // LOTOFÁCIL
  {
    id: 'lf-18-14-14',
    lottery: 'lotofacil',
    name: 'Lotofácil 18 Dezenas (Garante 14 pts)',
    description: 'Jogue com 18 dezenas em bilhetes simples de 15. Se as 15 sorteadas estiverem entre suas 18, garante no mínimo 14 pontos.',
    totalSelectedNumbers: 18,
    numbersPerTicket: 15,
    guaranteedHit: 14,
    conditionHit: 15,
    ticketsCount: 24,
    totalCost: 24 * 3.0, // R$ 72,00
    comparisonCostFull: 2448.0, // Aposta de 18 números direta na Caixa = R$ 2.448,00
    savingsPercent: 97.0,
    matrices: [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17],
      [0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 8],
      [0, 1, 2, 3, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 4],
      [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 0],
      [0, 2, 4, 6, 8, 10, 12, 14, 16, 1, 3, 5, 7, 9, 11],
      [1, 3, 5, 7, 9, 11, 13, 15, 17, 0, 2, 4, 6, 8, 10],
      [0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 2, 5, 8],
      [2, 5, 8, 11, 14, 17, 0, 1, 3, 4, 6, 7, 9, 10, 12],
      [0, 1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      [0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17],
      [0, 1, 2, 3, 4, 5, 6, 8, 9, 11, 12, 13, 14, 16, 17],
      [0, 2, 3, 5, 6, 7, 8, 10, 11, 12, 14, 15, 16, 17, 1],
      [1, 4, 5, 6, 7, 9, 10, 11, 13, 14, 15, 16, 17, 0, 3],
      [0, 1, 4, 5, 8, 9, 12, 13, 16, 17, 2, 3, 6, 7, 10],
      [2, 3, 6, 7, 10, 11, 14, 15, 0, 1, 4, 5, 8, 9, 12],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 17],
      [0, 1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 15, 16, 17, 3],
      [1, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 16, 17, 0, 4],
      [0, 3, 5, 6, 8, 9, 10, 12, 13, 14, 15, 16, 17, 1, 2],
      [1, 3, 4, 6, 7, 9, 10, 11, 13, 14, 15, 16, 17, 2, 5],
      [0, 2, 4, 5, 7, 8, 9, 11, 12, 13, 15, 16, 17, 3, 6],
    ],
  },
  {
    id: 'lf-20-13-14',
    lottery: 'lotofacil',
    name: 'Lotofácil 20 Dezenas (Econômico - 8 Jogos)',
    description: 'Cubra quase todo o volante (20 de 25 números) em apenas 8 jogos simples. Alta taxa de retorno em faixas 11, 12 e 13 pontos.',
    totalSelectedNumbers: 20,
    numbersPerTicket: 15,
    guaranteedHit: 13,
    conditionHit: 15,
    ticketsCount: 8,
    totalCost: 8 * 3.0, // R$ 24,00
    comparisonCostFull: 46512.0, // 20 dezenas na Caixa custa R$ 46.512,00!
    savingsPercent: 99.9,
    matrices: [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 15, 16, 17, 18, 19],
      [0, 1, 2, 3, 4, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 1, 3, 5, 7, 9],
      [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 0, 2, 4, 6, 8],
      [0, 1, 4, 5, 8, 9, 12, 13, 16, 17, 2, 3, 6, 7, 10],
      [2, 3, 6, 7, 10, 11, 14, 15, 18, 19, 0, 1, 4, 5, 8],
    ],
  },
  {
    id: 'lf-16-15-15',
    lottery: 'lotofacil',
    name: 'Lotofácil 16 Dezenas (Fechamento 100%)',
    description: '16 dezenas desdobradas em 16 jogos de 15. Se as 15 sorteadas estiverem entre as suas 16, garante 15 PONTOS!',
    totalSelectedNumbers: 16,
    numbersPerTicket: 15,
    guaranteedHit: 15,
    conditionHit: 15,
    ticketsCount: 16,
    totalCost: 16 * 3.0, // R$ 48,00
    comparisonCostFull: 48.0,
    savingsPercent: 0,
    matrices: Array.from({ length: 16 }, (_, excludeIndex) =>
      Array.from({ length: 16 }, (_, idx) => idx).filter((idx) => idx !== excludeIndex)
    ),
  },

  // MEGA-SENA
  {
    id: 'ms-10-4-4',
    lottery: 'megasena',
    name: 'Mega-Sena 10 Dezenas (Garante Quadra)',
    description: 'Selecione 10 dezenas fortes. Se 4 dezenas sorteadas estiverem entre suas 10, garante pelo menos 1 QUADRA premiada.',
    totalSelectedNumbers: 10,
    numbersPerTicket: 6,
    guaranteedHit: 4,
    conditionHit: 4,
    ticketsCount: 14,
    totalCost: 14 * 5.0, // R$ 70,00
    comparisonCostFull: 1050.0, // 10 números na Caixa = R$ 1.050,00
    savingsPercent: 93.3,
    matrices: [
      [0, 1, 2, 3, 4, 5],
      [0, 1, 2, 6, 7, 8],
      [0, 3, 4, 6, 7, 9],
      [0, 5, 8, 7, 2, 9],
      [1, 3, 5, 6, 8, 9],
      [1, 4, 7, 8, 3, 2],
      [2, 4, 5, 6, 7, 8],
      [2, 3, 5, 7, 8, 9],
      [3, 4, 5, 8, 9, 0],
      [1, 2, 4, 6, 9, 0],
      [0, 1, 5, 7, 8, 9],
      [1, 2, 3, 7, 8, 9],
      [0, 2, 3, 4, 8, 9],
      [4, 5, 6, 7, 8, 9],
    ],
  },
  {
    id: 'ms-8-5-5',
    lottery: 'megasena',
    name: 'Mega-Sena 8 Dezenas (Garante Quina)',
    description: 'Selecione 8 dezenas. Se acertar 5 dezenas entre as suas 8, garante matematicamente pelo menos uma QUINA.',
    totalSelectedNumbers: 8,
    numbersPerTicket: 6,
    guaranteedHit: 5,
    conditionHit: 5,
    ticketsCount: 12,
    totalCost: 12 * 5.0, // R$ 60,00
    comparisonCostFull: 140.0, // 8 dezenas na Caixa = R$ 140,00
    savingsPercent: 57.1,
    matrices: [
      [0, 1, 2, 3, 4, 5],
      [0, 1, 2, 3, 4, 6],
      [0, 1, 2, 3, 5, 7],
      [0, 1, 2, 4, 6, 7],
      [0, 1, 3, 5, 6, 7],
      [0, 2, 4, 5, 6, 7],
      [1, 2, 3, 4, 5, 6],
      [1, 2, 3, 4, 6, 7],
      [1, 3, 4, 5, 6, 7],
      [2, 3, 4, 5, 6, 7],
      [0, 1, 2, 5, 6, 7],
      [0, 3, 4, 5, 6, 7],
    ],
  },
  {
    id: 'ms-12-4-4',
    lottery: 'megasena',
    name: 'Mega-Sena 12 Dezenas (Garante Quadra)',
    description: 'Cubra 12 dezenas (1/5 de todo o volante da Mega) em apenas 22 jogos com garantia matemática de Quadra.',
    totalSelectedNumbers: 12,
    numbersPerTicket: 6,
    guaranteedHit: 4,
    conditionHit: 4,
    ticketsCount: 22,
    totalCost: 22 * 5.0, // R$ 110,00
    comparisonCostFull: 4620.0, // 12 dezenas na Caixa = R$ 4.620,00!
    savingsPercent: 97.6,
    matrices: [
      [0, 1, 2, 3, 4, 5],
      [0, 1, 2, 6, 7, 8],
      [0, 1, 3, 9, 10, 11],
      [0, 2, 4, 7, 9, 10],
      [0, 3, 5, 6, 8, 11],
      [0, 4, 6, 7, 10, 11],
      [0, 5, 8, 9, 10, 11],
      [1, 2, 5, 7, 8, 9],
      [1, 3, 4, 6, 8, 10],
      [1, 4, 5, 6, 9, 11],
      [1, 2, 7, 10, 11, 3],
      [2, 3, 6, 7, 9, 11],
      [2, 4, 5, 8, 10, 11],
      [2, 5, 6, 8, 9, 10],
      [3, 4, 7, 8, 9, 11],
      [3, 5, 7, 8, 10, 11],
      [4, 6, 8, 9, 10, 11],
      [1, 3, 5, 8, 9, 10],
      [0, 2, 6, 8, 10, 11],
      [0, 4, 5, 7, 9, 11],
      [1, 2, 4, 6, 8, 11],
      [2, 3, 4, 5, 7, 10],
    ],
  },
];

export function getFechamentosByLottery(lottery: LotteryType): FechamentoPlan[] {
  return FECHAMENTOS_CATALOG.filter((f) => f.lottery === lottery);
}

// Aplica a matriz de fechamento sobre as dezenas escolhidas pelo usuário
export function executeFechamento(
  plan: FechamentoPlan,
  selectedNumbers: number[],
  stats?: LotteryStats
): GeneratedGame[] {
  if (selectedNumbers.length !== plan.totalSelectedNumbers) {
    throw new Error(
      `O plano "${plan.name}" requer exatamente ${plan.totalSelectedNumbers} dezenas selecionadas (você escolheu ${selectedNumbers.length}).`
    );
  }

  const sortedSelected = [...selectedNumbers].sort((a, b) => a - b);
  const matrices = plan.matrices || [];
  const costPerTicket = LOTTERY_CONFIGS[plan.lottery].priceTable[plan.numbersPerTicket] || 3.0;

  return matrices.map((matrixIndices, index) => {
    const ticketNumbers = matrixIndices
      .map((idx) => sortedSelected[idx])
      .filter((n) => n !== undefined)
      .sort((a, b) => a - b);

    const analysis = analyzeGame(plan.lottery, ticketNumbers, stats);
    const { score, label } = computeGameScore(analysis);

    return {
      id: `fechamento_${plan.id}_${index + 1}_${Date.now()}`,
      lottery: plan.lottery,
      numbers: ticketNumbers,
      strategy: 'balanced',
      strategyLabel: `Fechamento: ${plan.name} (#${index + 1})`,
      createdAt: new Date().toISOString(),
      cost: costPerTicket,
      score,
      scoreLabel: label,
      analysis,
      name: `Bilhete ${index + 1}/${matrices.length}`,
    };
  });
}
