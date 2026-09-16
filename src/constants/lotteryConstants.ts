import { LotteryConfig, LotteryType } from '@/types/lottery';

/**
 * Configurações das loterias da Caixa Econômica Federal.
 * 
 * NOTA IMPORTANTE SOBRE VALORES "IDEAIS":
 * Os valores de idealSumRange e idealEvenRange são baseados em análise
 * estatística de sorteios históricos. Eles representam as faixas onde
 * a MAIORIA dos sorteios passados se concentrou, mas isso NÃO significa
 * que sorteios futuros seguirão o mesmo padrão.
 * 
 * Loterias são eventos INDEPENDENTES - cada sorteio tem a mesma
 * probabilidade para qualquer combinação válida.
 * 
 * Fontes de referência para análise:
 * - Portal de Loterias da Caixa: https://loterias.caixa.gov.br
 * - Dados históricos públicos de sorteios
 */
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
    /**
     * Distribuição no volante 5x5 (1 a 25):
     * [01][02][03][04][05]
     * [06][07][08][09][10]
     * [11][12][13][14][15]
     * [16][17][18][19][20]
     * [21][22][23][24][25]
     */
    colsGrid: 5,
    /**
     * Moldura: números nas bordas do volante 5x5
     * Análise histórica sugere distribuição equilibrada entre moldura e miolo
     */
    frameNumbers: [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25],
    /**
     * Miolo: números centrais do volante 5x5
     */
    centerNumbers: [7, 8, 9, 12, 13, 14, 17, 18, 19],
    /**
     * Números primos entre 1 e 25
     */
    primeNumbers: [2, 3, 5, 7, 11, 13, 17, 19, 23],
    /**
     * Faixa de soma "ideal" baseada em análise histórica.
     * ~85% dos sorteios da Lotofácil têm soma entre 180 e 220.
     * ATENÇÃO: Isso é uma observação estatística, não uma regra.
     * Sorteios futuros podem cair fora dessa faixa.
     */
    idealSumRange: [180, 220],
    /**
     * Faixa de pares "ideal" baseada em análise histórica.
     * A maioria dos sorteios tem entre 7 e 8 números pares.
     * ATENÇÃO: Cada sorteio é independente - não há "correção" se
     * sorteios anteriores tiveram muitos ou poucos pares.
     */
    idealEvenRange: [7, 8],
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
    /**
     * Números primos entre 1 e 60
     */
    primeNumbers: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59],
    /**
     * Faixa de soma "ideal" para 6 dezenas, baseada em análise histórica.
     * ATENÇÃO: Observação estatística, não garantia de resultado.
     */
    idealSumRange: [130, 235],
    /**
     * Faixa de pares "ideal" para 6 dezenas.
     * A distribuição mais comum é entre 2 e 4 pares.
     */
    idealEvenRange: [2, 4],
  },
};
