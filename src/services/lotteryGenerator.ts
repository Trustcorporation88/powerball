import {
  GameAnalysis,
  GeneratedGame,
  GenerationFilters,
  GeneratorStrategy,
  LotteryStats,
  LotteryType,
} from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';

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
  if (lottery === 'lotofacil' && config.frameNumbers && config.centerNumbers) {
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
  const [minSumIdeal, maxSumIdeal] = config.idealSumRange;
  let sumStatus: 'ideal' | 'moderada' | 'extrema' = 'ideal';
  if (sum < minSumIdeal - 25 || sum > maxSumIdeal + 25) {
    sumStatus = 'extrema';
  } else if (sum < minSumIdeal || sum > maxSumIdeal) {
    sumStatus = 'moderada';
  }

  // PONTUAÇÃO (SCORE 0 - 100)
  // 1. Paridade (Max 25 pts)
  let parityScore = 25;
  const [minEven, maxEven] = config.idealEvenRange;
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

  // 3. Distribuição / Espalhamento por faixas (Max 20 pts)
  let spreadScore = 20;
  if (lottery === 'megasena') {
    // Mega-Sena: 6 dezenas espalhadas em 6 dezenas (1-10, 11-20, ..., 51-60)
    const bins = new Set(sorted.map((n) => Math.floor((n - 1) / 10)));
    if (bins.size >= 5) spreadScore = 20;
    else if (bins.size === 4) spreadScore = 16;
    else if (bins.size === 3) spreadScore = 10;
    else spreadScore = 4;
  } else {
    // Lotofácil: espalhamento nas 5 linhas do volante
    const rows = new Set(sorted.map((n) => Math.floor((n - 1) / 5)));
    if (rows.size === 5) spreadScore = 20;
    else spreadScore = 12;
  }

  // 4. Penalidade por sequências longas (Max 15 pts)
  let consecutiveScore = 15;
  if (maxConsecutiveRun <= (lottery === 'megasena' ? 2 : 4)) {
    consecutiveScore = 15;
  } else if (maxConsecutiveRun === (lottery === 'megasena' ? 3 : 5)) {
    consecutiveScore = 8;
  } else {
    consecutiveScore = 0; // Excesso de números seguidos
  }

  // 5. Moldura ou Frequência (Max 15 pts)
  let frameOrFreqScore = 15;
  if (lottery === 'lotofacil' && frameHits !== undefined) {
    // Ideal: 9 ou 10 na moldura (5 ou 6 no miolo)
    if (frameHits === 10 || frameHits === 9) frameOrFreqScore = 15;
    else if (frameHits === 8 || frameHits === 11) frameOrFreqScore = 10;
    else frameOrFreqScore = 4;
  } else {
    // Mega-Sena: presença de números primos
    if (primeCount >= 1 && primeCount <= 3) frameOrFreqScore = 15;
    else frameOrFreqScore = 8;
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
  if (maxConsecutiveRun > (lottery === 'megasena' ? 2 : 4)) {
    recommendations.push(
      `Sequência longa de números consecutivos (${maxConsecutiveRun} seguidos). Sorteios com longas sequências são raros.`
    );
  }
  if (lottery === 'lotofacil' && frameHits !== undefined && (frameHits < 8 || frameHits > 11)) {
    recommendations.push(
      `Distribuição moldura/miolo incomum (${frameHits} na moldura). Mais de 70% dos concursos têm 9 ou 10 na moldura.`
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
        if (lottery === 'lotofacil' && config.frameNumbers && config.centerNumbers) {
          // Meta: 9 ou 10 na moldura, 5 ou 6 no miolo
          const targetFrame = Math.random() < 0.5 ? 10 : 9;
          const targetCenter = numbersCount - targetFrame;

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
        // Evita dezenas de 1 a 31 (datas de aniversário)
        // Mais de 70% dos apostadores marcam datas, o que divide os prêmios.
        const highPool = allPool.filter((n) => n > 31);
        while (chosen.size < numbersCount) {
          const pool = Math.random() < 0.65 && highPool.length ? highPool : allPool;
          const pick = pool[Math.floor(Math.random() * pool.length)];
          chosen.add(pick);
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

    const cost = config.priceTable[numbersCount] || config.priceTable[config.minSelection];

    games.push({
      id: `game_${Date.now()}_${games.length + 1}`,
      lottery,
      numbers: gameNumbers,
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
