import {
  GameAnalysis,
  GeneratedGame,
  GenerationFilters,
  GeneratorStrategy,
  LotteryExtraSelection,
  LotteryStats,
  LotteryType,
} from '@/types/lottery';
import { LOTTERY_CONFIGS, officialBetPrice } from '@/constants/lotteryConstants';

/**
 * As faixas ideais de paridade e soma em `LOTTERY_CONFIGS` valem para a aposta
 * mínima. Quem marca mais dezenas precisa da faixa proporcionalmente maior —
 * caso contrário um bilhete de 18 dezenas da Lotofácil seria sempre punido por
 * ter mais pares do que um de 15.
 */
function scaledRanges(lottery: LotteryType, numbersCount: number) {
  const config = LOTTERY_CONFIGS[lottery];
  const factor = numbersCount / config.minSelection;

  const [minEvenBase, maxEvenBase] = config.idealEvenRange;
  const [minSumBase, maxSumBase] = config.idealSumRange;

  return {
    evenRange: [Math.round(minEvenBase * factor), Math.round(maxEvenBase * factor)] as [
      number,
      number,
    ],
    sumRange: [Math.round(minSumBase * factor), Math.round(maxSumBase * factor)] as [number, number],
  };
}

/** Linhas do volante, usadas para medir espalhamento em qualquer modalidade. */
function rowCount(lottery: LotteryType): number {
  const config = LOTTERY_CONFIGS[lottery];
  return Math.ceil(config.totalNumbers / config.colsGrid);
}

/**
 * Tamanho de sequência consecutiva ainda considerado natural.
 * Quanto mais denso o volante (dezenas marcadas / universo), mais comum é
 * encontrar números seguidos: na Lotofácil marca-se 60% do volante, na Quina 6%.
 */
function maxNaturalRun(lottery: LotteryType, numbersCount: number): number {
  const config = LOTTERY_CONFIGS[lottery];
  const density = numbersCount / config.totalNumbers;
  if (density >= 0.5) return 4;
  if (density >= 0.2) return 3;
  return 2;
}

// Analisador X-Ray de bilhetes e cálculo do Score de Qualidade (0 a 100)
export function analyzeGame(
  lottery: LotteryType,
  numbers: number[],
  stats?: LotteryStats
): GameAnalysis {
  const config = LOTTERY_CONFIGS[lottery];
  const sorted = [...numbers].sort((a, b) => a - b);
  const evenCount = sorted.filter((n) => n % 2 === 0).length;
  const oddCount = sorted.length - evenCount;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const { evenRange, sumRange } = scaledRanges(lottery, sorted.length);

  // Primos
  const primeCount = sorted.filter((n) => config.primeNumbers.includes(n)).length;

  // Sequências consecutivas
  let consecutivePairs = 0;
  let currentRun = 1;
  let maxConsecutiveRun = 1;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] === sorted[i] + 1) {
      consecutivePairs++;
      currentRun++;
      if (currentRun > maxConsecutiveRun) maxConsecutiveRun = currentRun;
    } else {
      currentRun = 1;
    }
  }

  // Moldura e Miolo (Lotofácil)
  let frameHits: number | undefined;
  let centerHits: number | undefined;
  if (config.frameNumbers && config.centerNumbers) {
    frameHits = sorted.filter((n) => config.frameNumbers?.includes(n)).length;
    centerHits = sorted.filter((n) => config.centerNumbers?.includes(n)).length;
  }

  // Repetição do concurso anterior
  let previousDrawRepeats: number | undefined;
  if (stats?.ultimoConcurso?.dezenas?.length) {
    previousDrawRepeats = sorted.filter((n) =>
      stats.ultimoConcurso.dezenas.includes(n)
    ).length;
  }

  // Avaliação da Soma
  const [minSumIdeal, maxSumIdeal] = sumRange;
  // A tolerância acompanha a escala do volante: 25 pontos valem muito na
  // Lotofácil (soma ~200) e quase nada na Quina (soma ~202 com dezenas até 80).
  const sumTolerance = Math.max(20, Math.round((maxSumIdeal - minSumIdeal) * 0.35));
  let sumStatus: 'ideal' | 'moderada' | 'extrema' = 'ideal';
  if (sum < minSumIdeal - sumTolerance || sum > maxSumIdeal + sumTolerance) {
    sumStatus = 'extrema';
  } else if (sum < minSumIdeal || sum > maxSumIdeal) {
    sumStatus = 'moderada';
  }

  // PONTUAÇÃO (SCORE 0 - 100)
  // 1. Paridade (Max 25 pts)
  let parityScore = 25;
  const [minEven, maxEven] = evenRange;
  if (evenCount >= minEven && evenCount <= maxEven) {
    parityScore = 25;
  } else if (Math.abs(evenCount - minEven) === 1 || Math.abs(evenCount - maxEven) === 1) {
    parityScore = 18;
  } else if (Math.abs(evenCount - minEven) === 2 || Math.abs(evenCount - maxEven) === 2) {
    parityScore = 10;
  } else {
    parityScore = 3;
  }

  // 2. Soma (Max 25 pts)
  let sumScore = 25;
  if (sumStatus === 'ideal') sumScore = 25;
  else if (sumStatus === 'moderada') sumScore = 15;
  else sumScore = 5;

  // 3. Distribuição / Espalhamento pelas linhas do volante (Max 20 pts)
  // Sorteios reais quase nunca se concentram em poucas linhas, então medimos
  // quantas linhas o bilhete cobre em relação ao máximo possível.
  const totalRows = rowCount(lottery);
  const rowsCovered = new Set(sorted.map((n) => Math.floor((n - 1) / config.colsGrid))).size;
  const spreadRatio = rowsCovered / Math.min(sorted.length, totalRows);

  let spreadScore: number;
  if (spreadRatio >= 0.99) spreadScore = 20;
  else if (spreadRatio >= 0.8) spreadScore = 16;
  else if (spreadRatio >= 0.6) spreadScore = 11;
  else if (spreadRatio >= 0.4) spreadScore = 6;
  else spreadScore = 3;

  // 4. Penalidade por sequências longas (Max 15 pts)
  const runLimit = maxNaturalRun(lottery, sorted.length);
  let consecutiveScore = 15;
  if (maxConsecutiveRun <= runLimit) {
    consecutiveScore = 15;
  } else if (maxConsecutiveRun === runLimit + 1) {
    consecutiveScore = 8;
  } else {
    consecutiveScore = 0; // Excesso de números seguidos
  }

  // 5. Moldura (Lotofácil) ou densidade de primos (demais modalidades) (Max 15 pts)
  let frameOrFreqScore = 15;
  if (frameHits !== undefined && config.frameNumbers) {
    // O alvo acompanha a proporção da moldura no volante: com 15 dezenas na
    // Lotofácil dá 9 ou 10 na moldura, exatamente o padrão histórico.
    const esperado = (sorted.length * config.frameNumbers.length) / config.totalNumbers;
    const distancia = Math.abs(frameHits - esperado);
    if (distancia <= 0.75) frameOrFreqScore = 15;
    else if (distancia <= 1.75) frameOrFreqScore = 10;
    else frameOrFreqScore = 4;
  } else {
    const esperadoPrimos = (sorted.length * config.primeNumbers.length) / config.totalNumbers;
    frameOrFreqScore = Math.abs(primeCount - esperadoPrimos) <= 1.5 ? 15 : 8;
  }

  const recommendations: string[] = [];
  if (parityScore < 15) {
    recommendations.push(
      `Equilíbrio par/ímpar desbalanceado (${evenCount} pares / ${oddCount} ímpares). O ideal histórico é entre ${minEven} e ${maxEven} pares.`
    );
  }
  if (sumStatus === 'extrema') {
    recommendations.push(
      `Soma total (${sum}) muito fora da faixa estatística ideal (${minSumIdeal} a ${maxSumIdeal}).`
    );
  }
  if (maxConsecutiveRun > runLimit) {
    recommendations.push(
      `Sequência longa de números consecutivos (${maxConsecutiveRun} seguidos). Sorteios com longas sequências são raros.`
    );
  }
  if (frameHits !== undefined && config.frameNumbers && frameOrFreqScore < 10) {
    recommendations.push(
      `Distribuição moldura/miolo incomum (${frameHits} na moldura). Mais de 70% dos concursos ficam próximos de ${Math.round((sorted.length * config.frameNumbers.length) / config.totalNumbers)} dezenas na moldura.`
    );
  }
  if (recommendations.length === 0) {
    recommendations.push('Excelente equilíbrio combinatório e métricas alinhadas aos padrões dos concursos da Caixa!');
  }

  return {
    evenCount,
    oddCount,
    sum,
    sumStatus,
    primeCount,
    consecutivePairs,
    maxConsecutiveRun,
    frameHits,
    centerHits,
    previousDrawRepeats,
    scoreBreakdown: {
      parityScore,
      sumScore,
      spreadScore,
      consecutivePenalty: consecutiveScore,
      frequencyScore: frameOrFreqScore,
      frameScore: frameHits !== undefined ? frameOrFreqScore : undefined,
    },
    recommendations,
  };
}

export function computeGameScore(analysis: GameAnalysis): {
  score: number;
  label: 'Excelente' | 'Muito Bom' | 'Bom' | 'Regular';
} {
  const { scoreBreakdown } = analysis;
  const total =
    scoreBreakdown.parityScore +
    scoreBreakdown.sumScore +
    scoreBreakdown.spreadScore +
    scoreBreakdown.consecutivePenalty +
    scoreBreakdown.frequencyScore;

  const boundedScore = Math.max(10, Math.min(100, total));

  let label: 'Excelente' | 'Muito Bom' | 'Bom' | 'Regular' = 'Regular';
  if (boundedScore >= 88) label = 'Excelente';
  else if (boundedScore >= 75) label = 'Muito Bom';
  else if (boundedScore >= 60) label = 'Bom';

  return { score: boundedScore, label };
}

export function getStrategyLabel(strategy: GeneratorStrategy): string {
  const map: Record<GeneratorStrategy, string> = {
    balanced: 'Equilibrado (Frequentes + Atrasadas)',
    hot: 'Dezenas Quentes (Mais Sorteados)',
    cold: 'Dezenas Atrasadas (Lei do Retorno)',
    affinity: 'Afinidade Histórica (Pares Casados)',
    frame_center: 'Moldura e Miolo (Padrão Ouro)',
    parity_sum: 'Paridade & Soma Normal',
    anti_popular: 'Anti-Popular (Evita Divisão)',
    ai_smart: 'Motor Heurístico Inteligente (IA)',
    random: 'Surpresinha Aleatória Filtrada',
  };
  return map[strategy] || strategy;
}

/**
 * Preenche o campo extra do volante (Mês da Sorte / Trevos da Sorte).
 * Respeita o que o usuário fixou e, no que sobrar, segue a mesma lógica da
 * estratégia escolhida para as dezenas.
 */
function buildExtraSelection(
  lottery: LotteryType,
  strategy: GeneratorStrategy,
  stats: LotteryStats,
  userSelection?: LotteryExtraSelection
): LotteryExtraSelection | undefined {
  const field = LOTTERY_CONFIGS[lottery].extraField;
  if (!field) return undefined;

  const frequencias = stats.extraFrequencias ?? {};
  const ordered = [...field.options].sort((a, b) => {
    const diff = (frequencias[b] ?? 0) - (frequencias[a] ?? 0);
    return strategy === 'cold' ? -diff : diff;
  });

  // Estratégias sem leitura de frequência sorteiam livremente.
  const pool = strategy === 'hot' || strategy === 'cold' || strategy === 'ai_smart'
    ? ordered.slice(0, Math.max(field.maxSelection, Math.ceil(ordered.length * 0.5)))
    : field.options;

  if (field.key === 'mesSorte') {
    const escolhido = userSelection?.mesSorte ?? pool[Math.floor(Math.random() * pool.length)];
    return { mesSorte: escolhido };
  }

  const fixados = userSelection?.trevos ?? [];
  const trevos = new Set<number>(fixados);
  const candidatos = pool.map(Number).filter((n) => Number.isFinite(n));

  while (trevos.size < field.minSelection && candidatos.length > 0) {
    trevos.add(candidatos[Math.floor(Math.random() * candidatos.length)]);
  }

  return { trevos: Array.from(trevos).sort((a, b) => a - b) };
}

// Gerador multiestratégia com restrições e filtros
export function generateLotteryGames(
  lottery: LotteryType,
  filters: GenerationFilters,
  stats: LotteryStats
): GeneratedGame[] {
  const config = LOTTERY_CONFIGS[lottery];
  const {
    strategy,
    numbersCount,
    fixedNumbers,
    excludedNumbers,
    gamesCount,
    minEven,
    maxEven,
    minSum,
    maxSum,
    maxConsecutive,
  } = filters;

  const games: GeneratedGame[] = [];
  const allPool: number[] = [];
  for (let i = 1; i <= config.totalNumbers; i++) {
    if (!excludedNumbers.includes(i)) {
      allPool.push(i);
    }
  }

  // Dezenas ordenadas por frequência
  const sortedByFreq = [...allPool].sort(
    (a, b) => (stats.frequencias[b] || 0) - (stats.frequencias[a] || 0)
  );

  // Dezenas ordenadas por atraso
  const sortedByDelay = [...allPool].sort(
    (a, b) => (stats.atrasos[b] || 0) - (stats.atrasos[a] || 0)
  );

  let attempts = 0;
  const maxAttempts = gamesCount * 200;

  while (games.length < gamesCount && attempts < maxAttempts) {
    attempts++;
    const chosen = new Set<number>(fixedNumbers);

    // Estratégia de preenchimento do bilhete
    switch (strategy) {
      case 'hot': {
        // 75% dos números escolhidos do terço superior de mais frequentes
        const hotPool = sortedByFreq.slice(0, Math.ceil(sortedByFreq.length * 0.45));
        while (chosen.size < numbersCount) {
          const pool = Math.random() < 0.75 && hotPool.length ? hotPool : allPool;
          const pick = pool[Math.floor(Math.random() * pool.length)];
          chosen.add(pick);
        }
        break;
      }

      case 'cold': {
        // Prioriza números atrasados
        const coldPool = sortedByDelay.slice(0, Math.ceil(sortedByDelay.length * 0.45));
        while (chosen.size < numbersCount) {
          const pool = Math.random() < 0.75 && coldPool.length ? coldPool : allPool;
          const pick = pool[Math.floor(Math.random() * pool.length)];
          chosen.add(pick);
        }
        break;
      }

      case 'affinity': {
        // Inicia com um dos pares mais frequentes
        if (stats.paresFrequentes.length > 0 && chosen.size < numbersCount) {
          const randomTopPair =
            stats.paresFrequentes[
              Math.floor(Math.random() * Math.min(10, stats.paresFrequentes.length))
            ];
          if (!excludedNumbers.includes(randomTopPair.pair[0])) chosen.add(randomTopPair.pair[0]);
          if (!excludedNumbers.includes(randomTopPair.pair[1])) chosen.add(randomTopPair.pair[1]);
        }
        while (chosen.size < numbersCount) {
          const pick = allPool[Math.floor(Math.random() * allPool.length)];
          chosen.add(pick);
        }
        break;
      }

      case 'frame_center': {
        if (config.frameNumbers && config.centerNumbers) {
          // Meta: a proporção histórica da moldura, com variação de ±1 dezena.
          const esperado = (numbersCount * config.frameNumbers.length) / config.totalNumbers;
          const targetFrame = Math.random() < 0.5 ? Math.floor(esperado) : Math.ceil(esperado);

          const framePool = config.frameNumbers.filter(
            (n) => !excludedNumbers.includes(n) && !chosen.has(n)
          );
          const centerPool = config.centerNumbers.filter(
            (n) => !excludedNumbers.includes(n) && !chosen.has(n)
          );

          while (
            Array.from(chosen).filter((n) => config.frameNumbers?.includes(n)).length <
              targetFrame &&
            framePool.length > 0
          ) {
            const idx = Math.floor(Math.random() * framePool.length);
            chosen.add(framePool.splice(idx, 1)[0]);
          }

          while (chosen.size < numbersCount && centerPool.length > 0) {
            const idx = Math.floor(Math.random() * centerPool.length);
            chosen.add(centerPool.splice(idx, 1)[0]);
          }
        }
        while (chosen.size < numbersCount) {
          const pick = allPool[Math.floor(Math.random() * allPool.length)];
          chosen.add(pick);
        }
        break;
      }

      case 'anti_popular': {
        // Mais de 70% dos apostadores marcam datas de aniversário, o que divide
        // os prêmios. Onde o volante passa de 31 dezenas, fugimos da faixa de
        // dias do mês; em volantes menores (Lotofácil, Dia de Sorte) todas as
        // dezenas são "data válida", então evitamos 1 a 12, que acumulam a
        // marcação de dia e de mês.
        const highPool =
          config.totalNumbers > 31 ? allPool.filter((n) => n > 31) : allPool.filter((n) => n > 12);
        const viés = config.totalNumbers > 31 ? 0.65 : 0.6;

        while (chosen.size < numbersCount) {
          const pool = Math.random() < viés && highPool.length ? highPool : allPool;
          const pick = pool[Math.floor(Math.random() * pool.length)];
          chosen.add(pick);
        }
        break;
      }

      case 'random': {
        // Surpresinha de verdade: sorteio uniforme no volante. Os filtros de
        // validade ainda se aplicam depois, mas a escolha não é enviesada.
        while (chosen.size < numbersCount) {
          chosen.add(allPool[Math.floor(Math.random() * allPool.length)]);
        }
        break;
      }

      case 'parity_sum': {
        // Monta o bilhete mirando diretamente a paridade e a soma típicas dos
        // concursos, em vez de torcer para que o sorteio caia na faixa.
        const { evenRange, sumRange } = scaledRanges(lottery, numbersCount);
        const alvoPares =
          evenRange[0] + Math.floor(Math.random() * (evenRange[1] - evenRange[0] + 1));

        const pares = allPool.filter((n) => n % 2 === 0);
        const impares = allPool.filter((n) => n % 2 !== 0);
        const paresFixos = Array.from(chosen).filter((n) => n % 2 === 0).length;

        const sortear = (pool: number[], quantos: number) => {
          const restante = [...pool].filter((n) => !chosen.has(n));
          for (let k = 0; k < quantos && restante.length > 0; k++) {
            const idx = Math.floor(Math.random() * restante.length);
            chosen.add(restante.splice(idx, 1)[0]);
          }
        };

        sortear(pares, Math.max(0, alvoPares - paresFixos));
        sortear(impares, numbersCount - chosen.size);

        // Se a soma escapou da faixa, troca a dezena mais extrema por outra.
        let tentativasDeAjuste = 0;
        while (tentativasDeAjuste < 40) {
          const atual = Array.from(chosen);
          const soma = atual.reduce((a, b) => a + b, 0);
          if (soma >= sumRange[0] && soma <= sumRange[1]) break;

          const precisaSubir = soma < sumRange[0];
          const alvo = precisaSubir
            ? Math.min(...atual)
            : Math.max(...atual);
          const substitutos = allPool.filter(
            (n) => !chosen.has(n) && n % 2 === alvo % 2 && (precisaSubir ? n > alvo : n < alvo),
          );
          if (substitutos.length === 0) break;

          chosen.delete(alvo);
          chosen.add(substitutos[Math.floor(Math.random() * substitutos.length)]);
          tentativasDeAjuste++;
        }

        while (chosen.size < numbersCount) {
          chosen.add(allPool[Math.floor(Math.random() * allPool.length)]);
        }
        break;
      }

      case 'balanced':
      case 'ai_smart':
      default: {
        // Heurística combinatória:
        // ~40% frequentes, ~30% atrasadas, ~30% neutras
        const topFreq = sortedByFreq.slice(0, Math.floor(sortedByFreq.length * 0.35));
        const topDelay = sortedByDelay.slice(0, Math.floor(sortedByDelay.length * 0.35));

        while (chosen.size < numbersCount) {
          const roll = Math.random();
          let pick: number;
          if (roll < 0.45 && topFreq.length) {
            pick = topFreq[Math.floor(Math.random() * topFreq.length)];
          } else if (roll < 0.75 && topDelay.length) {
            pick = topDelay[Math.floor(Math.random() * topDelay.length)];
          } else {
            pick = allPool[Math.floor(Math.random() * allPool.length)];
          }
          chosen.add(pick);
        }
        break;
      }
    }

    if (chosen.size !== numbersCount) continue;

    const gameNumbers = Array.from(chosen).sort((a, b) => a - b);

    // Validação de filtros opcionais
    const evenCount = gameNumbers.filter((n) => n % 2 === 0).length;
    if (minEven !== undefined && evenCount < minEven) continue;
    if (maxEven !== undefined && evenCount > maxEven) continue;

    const sum = gameNumbers.reduce((a, b) => a + b, 0);
    if (minSum !== undefined && sum < minSum) continue;
    if (maxSum !== undefined && sum > maxSum) continue;

    const analysis = analyzeGame(lottery, gameNumbers, stats);
    if (maxConsecutive && analysis.maxConsecutiveRun > maxConsecutive) continue;

    // Garante que o jogo não é duplicado no lote atual
    const gameSignature = gameNumbers.join('-');
    const exists = games.some((g) => g.numbers.join('-') === gameSignature);
    if (exists) continue;

    const { score, label } = computeGameScore(analysis);

    // Se for ai_smart, descarta jogos com score menor que 70 para manter excelência
    if (strategy === 'ai_smart' && score < 70 && attempts < maxAttempts - 20) {
      continue;
    }

    const extra = buildExtraSelection(lottery, strategy, stats, filters.extraSelection);
    const cost = officialBetPrice(lottery, numbersCount, extra?.trevos?.length);

    games.push({
      id: `game_${Date.now()}_${games.length + 1}`,
      lottery,
      numbers: gameNumbers,
      extra,
      strategy,
      strategyLabel: getStrategyLabel(strategy),
      createdAt: new Date().toISOString(),
      cost,
      score,
      scoreLabel: label,
      analysis,
    });
  }

  // Ordena os melhores pontuados no topo
  return games.sort((a, b) => b.score - a.score);
}
