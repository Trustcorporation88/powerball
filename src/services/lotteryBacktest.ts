import {
  BacktestReport,
  BacktestStrategyResult,
  BacktestTierResult,
  GeneratorStrategy,
  LotteryDraw,
  LotteryType,
} from '@/types/lottery';
import { LOTTERY_CONFIGS, officialBetPrice } from '@/constants/lotteryConstants';
import { calculateLotteryStats } from '@/services/lotteryHistoricalData';
import { generateLotteryGames, getStrategyLabel } from '@/services/lotteryGenerator';

/**
 * Prova real das estratégias.
 *
 * Para cada concurso da janela escolhida, o motor é alimentado APENAS com os
 * concursos anteriores a ele, gera bilhetes como geraria na véspera do sorteio
 * e só então compara com o resultado. Sem esse cuidado o teste "descobriria"
 * o próprio gabarito e devolveria números fantasiosos.
 *
 * O objetivo aqui não é provar que alguma estratégia vence a loteria — nenhuma
 * vence, porque cada sorteio é independente. É mostrar, com dados reais e
 * verificáveis, o quanto cada uma entrega de verdade em relação à expectativa
 * matemática de um jogo aleatório.
 */

/** Concursos anteriores considerados ao montar a estatística de cada simulação. */
const LOOKBACK_WINDOW = 250;

/** Mínimo de concursos anteriores para que a estatística signifique algo. */
const MIN_LOOKBACK = 50;

export interface BacktestOptions {
  lottery: LotteryType;
  draws: LotteryDraw[];
  strategies: GeneratorStrategy[];
  numbersCount?: number;
  /** Quantos concursos recentes simular. */
  janela?: number;
  ticketsPorConcurso?: number;
  onProgress?: (percent: number) => void;
}

/**
 * Acertos do bilhete no concurso. Na Dupla Sena o mesmo bilhete concorre nos
 * dois sorteios e vale o melhor resultado.
 */
export function countHits(lottery: LotteryType, numbers: number[], draw: LotteryDraw): number {
  const principal = numbers.filter((n) => draw.dezenas.includes(n)).length;

  if (LOTTERY_CONFIGS[lottery].hasSecondDraw && draw.dezenasSegundoSorteio?.length) {
    const segundo = numbers.filter((n) => draw.dezenasSegundoSorteio!.includes(n)).length;
    return Math.max(principal, segundo);
  }

  return principal;
}

/** Distribuição hipergeométrica: chance de acertar exatamente `k` dezenas. */
function hypergeometric(universo: number, sorteadas: number, marcadas: number, k: number): number {
  const c = (n: number, r: number) => {
    if (r < 0 || r > n) return 0;
    const limite = Math.min(r, n - r);
    let resultado = 1;
    for (let i = 1; i <= limite; i++) resultado = (resultado * (n - limite + i)) / i;
    return resultado;
  };

  const total = c(universo, marcadas);
  if (total === 0) return 0;
  return (c(sorteadas, k) * c(universo - sorteadas, marcadas - k)) / total;
}

/**
 * Acertos médios esperados por puro acaso. É a régua honesta contra a qual
 * qualquer estratégia deve ser medida.
 *
 * Na Dupla Sena o bilhete concorre em dois sorteios independentes e vale o
 * melhor deles, então a expectativa é a de `max(X, Y)` — bem acima da
 * expectativa de um sorteio só.
 */
export function theoreticalExpectation(lottery: LotteryType, numbersCount: number): number {
  const config = LOTTERY_CONFIGS[lottery];
  const sorteadas = config.minSelection;
  const maxHits = Math.min(numbersCount, sorteadas);

  if (!config.hasSecondDraw) {
    return (numbersCount * sorteadas) / config.totalNumbers;
  }

  // E[max(X,Y)] = Σ k · (F(k)² − F(k−1)²)
  let acumulada = 0;
  let esperanca = 0;
  for (let k = 0; k <= maxHits; k++) {
    const anterior = acumulada;
    acumulada += hypergeometric(config.totalNumbers, sorteadas, numbersCount, k);
    esperanca += k * (acumulada * acumulada - anterior * anterior);
  }

  return esperanca;
}

/** Soma os prêmios das faixas atingidas, quando o concurso traz rateio oficial. */
function prizeForHits(draw: LotteryDraw, lottery: LotteryType, hits: number): number {
  const tier = LOTTERY_CONFIGS[lottery].prizeTiers.find((t) => t.hits === hits);
  if (!tier || !draw.premiacoes?.length) return 0;

  const faixa = draw.premiacoes.find(
    (p) =>
      p.descricao?.toLowerCase().includes(tier.label.toLowerCase()) ||
      p.descricao?.startsWith(String(hits)),
  );

  return faixa?.valorPremio ?? 0;
}

function emptyTiers(lottery: LotteryType): BacktestTierResult[] {
  return LOTTERY_CONFIGS[lottery].prizeTiers.map((tier) => ({
    label: tier.label,
    hits: tier.hits,
    count: 0,
  }));
}

/** Devolve o controle ao navegador para a barra de progresso não travar. */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function runBacktest(options: BacktestOptions): Promise<BacktestReport> {
  const {
    lottery,
    draws,
    strategies,
    janela = 100,
    ticketsPorConcurso = 3,
    onProgress,
  } = options;

  const config = LOTTERY_CONFIGS[lottery];
  const numbersCount = options.numbersCount ?? config.minSelection;

  const ordenados = [...draws].sort((a, b) => b.concurso - a.concurso);

  // Só podemos simular concursos que tenham histórico anterior suficiente.
  const maxSimulavel = Math.max(0, ordenados.length - MIN_LOOKBACK);
  const totalConcursos = Math.min(janela, maxSimulavel);

  // A estratégia aleatória é o baseline; entra sempre, mesmo sem ser pedida.
  const estrategiasTestadas: GeneratorStrategy[] = Array.from(new Set([...strategies, 'random']));

  const acumulado = new Map<
    GeneratorStrategy,
    { hits: number[]; tiers: BacktestTierResult[]; custo: number; retorno: number }
  >();

  for (const strategy of estrategiasTestadas) {
    acumulado.set(strategy, {
      hits: [],
      tiers: emptyTiers(lottery),
      custo: 0,
      retorno: 0,
    });
  }

  for (let i = 0; i < totalConcursos; i++) {
    const alvo = ordenados[i];
    // Apenas o passado do concurso alvo — é aqui que evitamos o lookahead.
    const historicoAnterior = ordenados.slice(i + 1, i + 1 + LOOKBACK_WINDOW);
    if (historicoAnterior.length < MIN_LOOKBACK) break;

    const statsNaEpoca = calculateLotteryStats(lottery, historicoAnterior);

    for (const strategy of estrategiasTestadas) {
      const bilhetes = generateLotteryGames(
        lottery,
        {
          strategy,
          numbersCount,
          fixedNumbers: [],
          excludedNumbers: [],
          gamesCount: ticketsPorConcurso,
        },
        statsNaEpoca,
      );

      const registro = acumulado.get(strategy)!;

      for (const bilhete of bilhetes) {
        const hits = countHits(lottery, bilhete.numbers, alvo);
        registro.hits.push(hits);
        registro.custo += bilhete.cost;
        registro.retorno += prizeForHits(alvo, lottery, hits);

        const tier = registro.tiers.find((t) => t.hits === hits);
        if (tier) tier.count += 1;
      }
    }

    if (i % 5 === 0) {
      onProgress?.(Math.round(((i + 1) / totalConcursos) * 100));
      await yieldToBrowser();
    }
  }

  onProgress?.(100);

  const media = (values: number[]) =>
    values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

  const baselineAleatorio = media(acumulado.get('random')?.hits ?? []);

  const resultados: BacktestStrategyResult[] = estrategiasTestadas.map((strategy) => {
    const registro = acumulado.get(strategy)!;
    const mediaAcertos = media(registro.hits);

    return {
      strategy,
      strategyLabel: getStrategyLabel(strategy),
      concursosTestados: totalConcursos,
      ticketsSimulados: registro.hits.length,
      mediaAcertos: Math.round(mediaAcertos * 1000) / 1000,
      melhorAcerto: registro.hits.length ? Math.max(...registro.hits) : 0,
      tiers: registro.tiers.filter((tier) => tier.count > 0),
      custoTotal: Math.round(registro.custo * 100) / 100,
      retornoEstimado: Math.round(registro.retorno * 100) / 100,
      vantagemSobreAleatorio: Math.round((mediaAcertos - baselineAleatorio) * 1000) / 1000,
    };
  });

  // Melhor média primeiro, mantendo o baseline visível para comparação.
  resultados.sort((a, b) => b.mediaAcertos - a.mediaAcertos);

  return {
    lottery,
    numbersCount,
    janelaConcursos: totalConcursos,
    ticketsPorConcurso,
    baselineAleatorio: Math.round(baselineAleatorio * 1000) / 1000,
    esperancaTeorica: Math.round(theoreticalExpectation(lottery, numbersCount) * 1000) / 1000,
    resultados,
    geradoEm: new Date().toISOString(),
  };
}

/** Custo de apostar uma quantidade de bilhetes, usado na projeção da tela. */
export function backtestCost(
  lottery: LotteryType,
  numbersCount: number,
  tickets: number,
): number {
  return Math.round(officialBetPrice(lottery, numbersCount) * tickets * 100) / 100;
}
