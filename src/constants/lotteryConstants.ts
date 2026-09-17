import { LotteryConfig, LotteryType } from '@/types/lottery';

/**
 * Tabelas de preço reproduzem literalmente as tabelas oficiais publicadas em
 * loterias.caixa.gov.br (reajuste vigente desde julho/2025), e não um cálculo
 * derivado, para que qualquer pessoa consiga auditá-las linha a linha.
 *
 * Os dias de sorteio foram conferidos contra o histórico real de concursos
 * baixado em `scripts/fetch-lottery-history.mjs`.
 */
export const LOTTERY_CONFIGS: Record<LotteryType, LotteryConfig> = {
  lotofacil: {
    type: 'lotofacil',
    name: 'Lotofácil',
    fullName: 'Lotofácil da Caixa',
    slug: 'lotofacil',
    color: '#9333ea', // Roxo vibrante oficial da Lotofácil
    accentColor: '#a855f7',
    badgeBg: 'bg-purple-100 dark:bg-purple-950',
    badgeText: 'text-purple-700 dark:text-purple-300',
    totalNumbers: 25,
    minSelection: 15,
    maxSelection: 20,
    drawDays: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    basePrice: 3.5,
    priceTable: {
      15: 3.5,
      16: 56.0,
      17: 476.0,
      18: 2856.0,
      19: 13566.0,
      20: 54264.0,
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
    prizeTiers: [
      { hits: 15, label: '15 acertos' },
      { hits: 14, label: '14 acertos' },
      { hits: 13, label: '13 acertos' },
      { hits: 12, label: '12 acertos' },
      { hits: 11, label: '11 acertos' },
    ],
    mainPrizeOdds: 3_268_760,
  },
  megasena: {
    type: 'megasena',
    name: 'Mega-Sena',
    fullName: 'Mega-Sena da Caixa',
    slug: 'mega-sena',
    color: '#16a34a', // Verde oficial da Mega-Sena
    accentColor: '#22c55e',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    totalNumbers: 60,
    minSelection: 6,
    maxSelection: 15,
    drawDays: ['Terça', 'Quinta', 'Sábado'],
    basePrice: 6.0,
    priceTable: {
      6: 6.0,
      7: 42.0,
      8: 168.0,
      9: 504.0,
      10: 1260.0,
      11: 2772.0,
      12: 5544.0,
      13: 10296.0,
      14: 18018.0,
      15: 30030.0,
    },
    colsGrid: 10,
    primeNumbers: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59],
    idealSumRange: [130, 235],
    idealEvenRange: [2, 4], // 2 a 4 pares (distribuição normal centrada em 3)
    prizeTiers: [
      { hits: 6, label: 'Sena' },
      { hits: 5, label: 'Quina' },
      { hits: 4, label: 'Quadra' },
    ],
    mainPrizeOdds: 50_063_860,
  },
  quina: {
    type: 'quina',
    name: 'Quina',
    fullName: 'Quina da Caixa',
    slug: 'quina',
    color: '#2563eb', // Azul oficial da Quina
    accentColor: '#3b82f6',
    badgeBg: 'bg-blue-100 dark:bg-blue-950',
    badgeText: 'text-blue-700 dark:text-blue-300',
    totalNumbers: 80,
    minSelection: 5,
    maxSelection: 15,
    drawDays: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    basePrice: 3.0,
    priceTable: {
      5: 3.0,
      6: 18.0,
      7: 63.0,
      8: 168.0,
      9: 378.0,
      10: 756.0,
      11: 1386.0,
      12: 2376.0,
      13: 3861.0,
      14: 6006.0,
      15: 9009.0,
    },
    colsGrid: 10,
    primeNumbers: [
      2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79,
    ],
    // Média teórica de 5 dezenas em 1..80 é 202,5.
    idealSumRange: [150, 255],
    idealEvenRange: [2, 3],
    prizeTiers: [
      { hits: 5, label: 'Quina' },
      { hits: 4, label: 'Quadra' },
      { hits: 3, label: 'Terno' },
      { hits: 2, label: 'Duque' },
    ],
    mainPrizeOdds: 24_040_016,
  },
  duplasena: {
    type: 'duplasena',
    name: 'Dupla Sena',
    fullName: 'Dupla Sena da Caixa',
    slug: 'dupla-sena',
    color: '#dc2626', // Vermelho oficial da Dupla Sena
    accentColor: '#ef4444',
    badgeBg: 'bg-red-100 dark:bg-red-950',
    badgeText: 'text-red-700 dark:text-red-300',
    totalNumbers: 50,
    minSelection: 6,
    maxSelection: 15,
    drawDays: ['Segunda', 'Quarta', 'Sexta'],
    basePrice: 3.0,
    priceTable: {
      6: 3.0,
      7: 21.0,
      8: 84.0,
      9: 252.0,
      10: 630.0,
      11: 1386.0,
      12: 2772.0,
      13: 5148.0,
      14: 9009.0,
      15: 15015.0,
    },
    colsGrid: 10,
    primeNumbers: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47],
    // Média teórica de 6 dezenas em 1..50 é 153.
    idealSumRange: [110, 195],
    idealEvenRange: [2, 4],
    prizeTiers: [
      { hits: 6, label: 'Sena' },
      { hits: 5, label: 'Quina' },
      { hits: 4, label: 'Quadra' },
      { hits: 3, label: 'Terno' },
    ],
    mainPrizeOdds: 15_890_700,
    hasSecondDraw: true,
  },
  diadesorte: {
    type: 'diadesorte',
    name: 'Dia de Sorte',
    fullName: 'Dia de Sorte da Caixa',
    slug: 'dia-de-sorte',
    color: '#ca8a04', // Dourado oficial do Dia de Sorte
    accentColor: '#eab308',
    badgeBg: 'bg-amber-100 dark:bg-amber-950',
    badgeText: 'text-amber-700 dark:text-amber-300',
    totalNumbers: 31,
    minSelection: 7,
    maxSelection: 15,
    drawDays: ['Terça', 'Quinta', 'Sábado'],
    basePrice: 2.5,
    priceTable: {
      7: 2.5,
      8: 20.0,
      9: 90.0,
      10: 300.0,
      11: 825.0,
      12: 1980.0,
      13: 4290.0,
      14: 8580.0,
      15: 16087.5,
    },
    colsGrid: 7, // Volante em formato de calendário (1 a 31)
    primeNumbers: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31],
    // Média teórica de 7 dezenas em 1..31 é 112.
    idealSumRange: [85, 140],
    idealEvenRange: [3, 4],
    prizeTiers: [
      { hits: 7, label: '7 acertos' },
      { hits: 6, label: '6 acertos' },
      { hits: 5, label: '5 acertos' },
      { hits: 4, label: '4 acertos' },
    ],
    mainPrizeOdds: 2_629_575,
    extraField: {
      key: 'mesSorte',
      label: 'Mês da Sorte',
      options: [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro',
      ],
      minSelection: 1,
      maxSelection: 1,
    },
  },
  maismilionaria: {
    type: 'maismilionaria',
    name: '+Milionária',
    fullName: '+Milionária da Caixa',
    slug: 'mais-milionaria',
    color: '#0f766e', // Verde-petróleo oficial da +Milionária
    accentColor: '#14b8a6',
    badgeBg: 'bg-teal-100 dark:bg-teal-950',
    badgeText: 'text-teal-700 dark:text-teal-300',
    totalNumbers: 50,
    minSelection: 6,
    maxSelection: 12,
    drawDays: ['Quarta', 'Sábado'],
    basePrice: 6.0,
    // Valores para o mínimo de 2 trevos; trevos adicionais multiplicam o custo
    // e são tratados em `officialBetPrice`.
    priceTable: {
      6: 6.0,
      7: 42.0,
      8: 168.0,
      9: 504.0,
      10: 1260.0,
      11: 2772.0,
      12: 5544.0,
    },
    colsGrid: 10,
    primeNumbers: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47],
    idealSumRange: [110, 195],
    idealEvenRange: [2, 4],
    prizeTiers: [
      { hits: 6, label: '6 acertos + 2 trevos', trevos: 2 },
      { hits: 6, label: '6 acertos + 1 trevo', trevos: 1 },
      { hits: 6, label: '6 acertos', trevos: 0 },
      { hits: 5, label: '5 acertos + 2 trevos', trevos: 2 },
      { hits: 5, label: '5 acertos + 1 trevo', trevos: 1 },
      { hits: 5, label: '5 acertos', trevos: 0 },
      { hits: 4, label: '4 acertos + 2 trevos', trevos: 2 },
      { hits: 4, label: '4 acertos', trevos: 0 },
      { hits: 3, label: '3 acertos + 2 trevos', trevos: 2 },
      { hits: 2, label: '2 acertos + 2 trevos', trevos: 2 },
    ],
    mainPrizeOdds: 238_360_500,
    extraField: {
      key: 'trevos',
      label: 'Trevos da Sorte',
      options: ['1', '2', '3', '4', '5', '6'],
      minSelection: 2,
      maxSelection: 6,
    },
  },
};

export const LOTTERY_ORDER: LotteryType[] = [
  'lotofacil',
  'megasena',
  'quina',
  'duplasena',
  'diadesorte',
  'maismilionaria',
];

/** Combinações de k elementos em n, usada no cálculo de desdobramentos. */
export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const limit = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= limit; i++) {
    result = (result * (n - limit + i)) / i;
  }
  return Math.round(result);
}

/**
 * Preço oficial da aposta. Para a +Milionária, trevos adicionais multiplicam
 * o número de apostas simples embutidas no bilhete.
 */
export function officialBetPrice(
  lottery: LotteryType,
  numbersCount: number,
  extraCount?: number,
): number {
  const config = LOTTERY_CONFIGS[lottery];
  const base = config.priceTable[numbersCount] ?? config.priceTable[config.minSelection];

  if (lottery === 'maismilionaria') {
    const trevos = extraCount ?? config.extraField?.minSelection ?? 2;
    const multiplicador = combinations(trevos, 2) || 1;
    return Math.round(base * multiplicador * 100) / 100;
  }

  return base;
}

export function savingsPercent(fullCost: number, reducedCost: number): number {
  if (fullCost <= 0) return 0;
  return Math.round(((fullCost - reducedCost) / fullCost) * 1000) / 10;
}

export function getLotteryConfig(lottery: LotteryType): LotteryConfig {
  return LOTTERY_CONFIGS[lottery];
}

/** Resolve o slug público (`/resultado/mega-sena/3058`) para o tipo interno. */
export function lotteryFromSlug(slug: string): LotteryType | null {
  const normalized = slug.trim().toLowerCase();
  const match = LOTTERY_ORDER.find(
    (type) => LOTTERY_CONFIGS[type].slug === normalized || type === normalized,
  );
  return match ?? null;
}
