import { FechamentoPlan, LotteryType } from '@/types/lottery';
import { LOTTERY_CONFIGS, combinations, officialBetPrice } from '@/constants/lotteryConstants';

/**
 * "Volante cheio ou jogos menores?"
 *
 * A Caixa cobra cada aposta pelo número de combinações mínimas que ela contém
 * (um volante de 8 dezenas da Mega-Sena = C(8,6) = 28 jogos de 6). Por isso,
 * para garantir o prêmio máximo com N dezenas, é preciso pagar TODAS as
 * combinações, e nenhuma mistura de volantes menores sai mais barata: no
 * máximo empata, e passa a pagar em dobro as combinações que se repetem.
 */

export interface Montagem {
  descricao: string;
  bilhetes: number;
  custo: number;
  /** Combinações pagas mais de uma vez. */
  repetidas: number;
}

export interface LinhaDeAcertos {
  /** Quantas das sorteadas caíram entre as suas N dezenas. */
  acertos: number;
  /** Probabilidade exata de exatamente `acertos` caírem nas suas N. */
  chance: number;
  /** Prêmios que o volante cheio paga, por faixa (só faixas com pelo menos 1). */
  premiosVolante: { faixa: string; quantidade: number }[];
}

export interface Simulacao {
  dezenas: number;
  combinacoes: number;
  precoCombinacao: number;
  custoMinimo: number;
  montagens: Montagem[];
  linhas: LinhaDeAcertos[];
  fechamentos: FechamentoPlan[];
}

/** Probabilidade em português: "0,539% (1 em 185)". */
export function formatarProbabilidade(p: number): string {
  if (p <= 0) return '0%';
  const casas = p >= 0.01 ? 2 : p >= 0.001 ? 3 : p >= 0.0001 ? 4 : 6;
  const percentual = (p * 100).toLocaleString('pt-BR', { maximumFractionDigits: casas });
  return `${percentual}% (1 em ${Math.round(1 / p).toLocaleString('pt-BR')})`;
}

/** Tamanhos de volante aceitos pela Caixa acima da aposta mínima. */
export function tamanhosDeVolante(lottery: LotteryType): number[] {
  const config = LOTTERY_CONFIGS[lottery];
  return Object.keys(config.priceTable)
    .map(Number)
    .filter((n) => n > config.minSelection)
    .sort((a, b) => a - b);
}

function plural(n: number, singular: string, pluralForma: string): string {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? singular : pluralForma}`;
}

export function simularVolante(
  lottery: LotteryType,
  dezenas: number,
  catalogo: FechamentoPlan[] = [],
): Simulacao {
  const config = LOTTERY_CONFIGS[lottery];
  const m = config.minSelection;
  const total = combinations(dezenas, m);
  const preco = (k: number) => officialBetPrice(lottery, k);
  const precoCombinacao = preco(m);

  const montagens: Montagem[] = [
    { descricao: `1 volante de ${dezenas} dezenas`, bilhetes: 1, custo: preco(dezenas), repetidas: 0 },
    {
      descricao: `${plural(total, 'jogo', 'jogos')} de ${m} dezenas`,
      bilhetes: total,
      custo: total * precoCombinacao,
      repetidas: 0,
    },
  ];

  // Volantes de N-1 dezenas: cada um deixa de fora uma das suas dezenas. As
  // combinações ainda não cobertas são as que contêm todas as deixadas de fora.
  const menor = dezenas - 1;
  if (menor > m) {
    const porMenor = combinations(menor, m);
    for (let t = 1; t <= Math.min(3, m); t++) {
      const faltam = combinations(dezenas - t, m - t);
      const cobertas = total - faltam;
      montagens.push({
        descricao: `${plural(t, 'volante', 'volantes')} de ${menor} + ${plural(faltam, 'jogo', 'jogos')} de ${m}`,
        bilhetes: t + faltam,
        custo: t * preco(menor) + faltam * precoCombinacao,
        repetidas: t * porMenor - cobertas,
      });
    }
    montagens.push({
      descricao: `${dezenas} volantes de ${menor} (todos)`,
      bilhetes: dezenas,
      custo: dezenas * preco(menor),
      repetidas: dezenas * porMenor - total,
    });
  }

  const faixas = [...new Map(config.prizeTiers.map((t) => [t.hits, t])).values()].sort(
    (a, b) => b.hits - a.hits,
  );
  const menorFaixa = Math.min(...faixas.map((t) => t.hits));
  const todasCombinacoes = combinations(config.totalNumbers, m);

  const linhas: LinhaDeAcertos[] = [];
  for (let h = Math.min(m, dezenas); h >= menorFaixa; h--) {
    const chance =
      (combinations(dezenas, h) * combinations(config.totalNumbers - dezenas, m - h)) /
      todasCombinacoes;
    const premiosVolante = faixas
      .map((faixa) => ({
        faixa: lottery === 'maismilionaria' ? `${faixa.hits} acertos` : faixa.label,
        quantidade: combinations(h, faixa.hits) * combinations(dezenas - h, m - faixa.hits),
      }))
      .filter((p) => p.quantidade > 0);
    linhas.push({ acertos: h, chance, premiosVolante });
  }

  return {
    dezenas,
    combinacoes: total,
    precoCombinacao,
    custoMinimo: total * precoCombinacao,
    montagens,
    linhas,
    fechamentos: catalogo
      .filter(
        (p) => p.lottery === lottery && p.totalSelectedNumbers === dezenas && !(p.fixedCount ?? 0),
      )
      .sort((a, b) => a.totalCost - b.totalCost),
  };
}
