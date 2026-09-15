import { LotteryConfig, LotteryType } from '@/types/lottery';

export const LOTTERY_CONFIGS: Record<LotteryType, LotteryConfig> = {
  lotofacil: {
    type: 'lotofacil',
    name: 'Lotofácil',
    fullName: 'Lotofácil da Caixa',
    color: '#9333ea', // Roxo vibrante oficial da Lotofácil
    accentColor: '#a855f7',
    badgeBg: 'bg-purple-100 dark:bg-purple-950',
    badgeText: 'text-purple-700 dark:text-purple-300',
    totalNumbers: 25,
    minSelection: 15,
    maxSelection: 20,
    drawDays: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    priceTable: {
      15: 3.00,
      16: 48.00,
      17: 408.00,
      18: 2448.00,
      19: 11628.00,
      20: 46512.00,
    },
    colsGrid: 5,
    // No volante 5x5: 1 a 25.
    // Moldura: 1,2,3,4,5, 6,10, 11,15, 16,20, 21,22,23,24,25 (16 números)
    // Miolo: 7,8,9, 12,13,14, 17,18,19 (9 números)
    frameNumbers: [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25],
    centerNumbers: [7, 8, 9, 12, 13, 14, 17, 18, 19],
    primeNumbers: [2, 3, 5, 7, 11, 13, 17, 19, 23],
    idealSumRange: [180, 220],
    idealEvenRange: [7, 8], // 7 ou 8 pares (o restante ímpares)
  },
  megasena: {
    type: 'megasena',
    name: 'Mega-Sena',
    fullName: 'Mega-Sena da Caixa',
    color: '#16a34a', // Verde oficial da Mega-Sena
    accentColor: '#22c55e',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    totalNumbers: 60,
    minSelection: 6,
    maxSelection: 15,
    drawDays: ['Terça', 'Quinta', 'Sábado'],
    priceTable: {
      6: 5.00,
      7: 35.00,
      8: 140.00,
      9: 420.00,
      10: 1050.00,
      11: 2310.00,
      12: 4620.00,
      13: 8580.00,
      14: 15015.00,
      15: 25025.00,
    },
    colsGrid: 10,
    primeNumbers: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59],
    idealSumRange: [130, 235],
    idealEvenRange: [2, 4], // 2 a 4 pares (distribuição normal centrada em 3)
  },
};
