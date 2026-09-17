import { LotteryDraw, LotteryStats, LotteryType } from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';

/**
 * Motor estatístico das loterias.
 *
 * Os concursos vêm de `lotteryApiService`, que combina a base embarcada
 * (~5.000 sorteios reais) com as fontes ao vivo. Aqui só transformamos essa
 * série em frequências, atrasos, afinidades e médias de paridade/soma.
 */

/**
 * Expande um concurso nas "observações" que ele produz.
 *
 * Na Dupla Sena cada concurso tem dois sorteios e o mesmo bilhete concorre nos
 * dois, então ambos contam como observações independentes para frequência e
 * atraso — ignorar o segundo sorteio descartaria metade dos dados.
 */
function toObservations(lottery: LotteryType, draws: LotteryDraw[]): number[][] {
  const hasSecondDraw = LOTTERY_CONFIGS[lottery].hasSecondDraw;
  const observations: number[][] = [];

  for (const draw of draws) {
    if (draw.dezenas.length > 0) observations.push(draw.dezenas);
    if (hasSecondDraw && draw.dezenasSegundoSorteio?.length) {
      observations.push(draw.dezenasSegundoSorteio);
    }
  }

  return observations;
}

// Cálculo do motor estatístico com pesos de frequência, atrasos e pares
export function calculateLotteryStats(lottery: LotteryType, draws: LotteryDraw[]): LotteryStats {
  const config = LOTTERY_CONFIGS[lottery];
  const frequencias: Record<number, number> = {};
  const atrasos: Record<number, number> = {};
  const pairsCount: Record<string, number> = {};

  // Inicializa contadores
  for (let n = 1; n <= config.totalNumbers; n++) {
    frequencias[n] = 0;
    atrasos[n] = 0;
  }

  // Ordena concursos do mais recente para o mais antigo
  const sortedDraws = [...draws].sort((a, b) => b.concurso - a.concurso);
  const observations = toObservations(lottery, sortedDraws);

  // Atraso: quantas observações se passaram desde a última aparição da dezena.
  // Uma varredura única evita o custo quadrático de buscar dezena por dezena.
  const pendentes = new Set<number>();
  for (let n = 1; n <= config.totalNumbers; n++) pendentes.add(n);

  for (let index = 0; index < observations.length && pendentes.size > 0; index++) {
    for (const numero of observations[index]) {
      if (pendentes.delete(numero)) {
        atrasos[numero] = index;
      }
    }
  }

  // Dezenas que nunca saíram na janela analisada recebem o atraso máximo.
  for (const numero of pendentes) {
    atrasos[numero] = observations.length;
  }

  let totalEven = 0;
  let totalSum = 0;
  let totalRepeats = 0;
  let repeatComparisons = 0;

  observations.forEach((nums, idx) => {
    totalEven += nums.filter((n) => n % 2 === 0).length;
    totalSum += nums.reduce((acc, curr) => acc + curr, 0);

    // Repetições em relação à observação anterior
    if (idx < observations.length - 1) {
      const anterior = observations[idx + 1];
      totalRepeats += nums.filter((n) => anterior.includes(n)).length;
      repeatComparisons++;
    }

    nums.forEach((n) => {
      frequencias[n] = (frequencias[n] || 0) + 1;
    });

    // Pares co-ocorrentes
    const ordenadas = [...nums].sort((a, b) => a - b);
    for (let i = 0; i < ordenadas.length; i++) {
      for (let j = i + 1; j < ordenadas.length; j++) {
        const pairKey = `${ordenadas[i]}-${ordenadas[j]}`;
        pairsCount[pairKey] = (pairsCount[pairKey] || 0) + 1;
      }
    }
  });

  // Frequência do campo extra (Mês da Sorte / Trevos da Sorte)
  const extraFrequencias: Record<string, number> = {};
  const extraField = config.extraField;
  if (extraField) {
    for (const option of extraField.options) extraFrequencias[option] = 0;

    for (const draw of sortedDraws) {
      if (extraField.key === 'mesSorte' && draw.mesSorte) {
        const chave = draw.mesSorte.trim();
        if (chave in extraFrequencias) extraFrequencias[chave] += 1;
      } else if (extraField.key === 'trevos' && draw.trevos?.length) {
        for (const trevo of draw.trevos) {
          const chave = String(trevo);
          if (chave in extraFrequencias) extraFrequencias[chave] += 1;
        }
      }
    }
  }

  const parsedPairs: Array<{ pair: [number, number]; count: number }> = Object.entries(pairsCount)
    .map(([key, count]) => {
      const [a, b] = key.split('-').map(Number);
      return { pair: [a, b] as [number, number], count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const totalObs = observations.length || 1;
  const mediaPares = Math.round((totalEven / totalObs) * 10) / 10;
  const numbersPerTicket = observations[0]?.length || config.minSelection;
  const mediaImpares = Math.round((numbersPerTicket - mediaPares) * 10) / 10;
  const mediaSoma = Math.round(totalSum / totalObs);
  const repeticoesDoAnteriorMedia =
    repeatComparisons > 0 ? Math.round((totalRepeats / repeatComparisons) * 10) / 10 : undefined;

  return {
    totalConcursos: sortedDraws.length,
    ultimoConcurso: sortedDraws[0] || {
      loteria: lottery,
      concurso: 0,
      data: new Date().toLocaleDateString('pt-BR'),
      dezenas: [],
      acumulou: false,
    },
    frequencias,
    atrasos,
    paresFrequentes: parsedPairs,
    mediaPares,
    mediaImpares,
    mediaSoma,
    repeticoesDoAnteriorMedia,
    extraFrequencias: extraField ? extraFrequencias : undefined,
  };
}
