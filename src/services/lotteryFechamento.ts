import {
  FechamentoPlan,
  GeneratedGame,
  LotteryExtraSelection,
  LotteryStats,
  LotteryType,
} from '@/types/lottery';
import {
  LOTTERY_CONFIGS,
  combinations,
  officialBetPrice,
  savingsPercent,
} from '@/constants/lotteryConstants';
import fechamentosGerados from '@/data/fechamentos.json';
import { analyzeGame, computeGameScore } from './lotteryGenerator';
import { ordenarContraDivisao, popularidadeDoJogo } from './lotteryPopularidade';

/**
 * Catálogo de fechamentos (wheeling systems).
 *
 * As matrizes vêm de `scripts/build-fechamentos.mjs`, que monta cada cobertura
 * por busca gulosa e só grava o plano depois de conferir por força bruta que
 * TODOS os cenários possíveis atingem a faixa prometida.
 *
 * Isso importa: a versão anterior deste catálogo era escrita à mão e anunciava
 * garantias que não se sustentavam — o plano de 10 dezenas da Mega-Sena dizia
 * garantir Quadra e no pior caso entregava Terno, que nem faixa premiada é.
 * Nenhuma garantia é publicada aqui sem ter sido verificada.
 */

interface PlanoGerado {
  id: string;
  lottery: LotteryType;
  totalSelectedNumbers: number;
  numbersPerTicket: number;
  conditionHit: number;
  guaranteedHit: number;
  ticketsCount: number;
  matrices: number[][];
  fixas?: number;
}

/** Nome da faixa premiada correspondente ao número de acertos. */
function tierLabel(lottery: LotteryType, hits: number): string {
  const tier = LOTTERY_CONFIGS[lottery].prizeTiers.find((t) => t.hits === hits);
  return tier?.label ?? `${hits} acertos`;
}

/**
 * Probabilidade exata de o sorteio cair na condição da garantia: todas as
 * fixas sorteadas e pelo menos `conditionHit - fixas` das demais no grupo.
 * Na Dupla Sena a garantia vale em cada um dos dois sorteios independentes.
 */
export function chanceDaGarantia(
  lottery: LotteryType,
  totalSelecionadas: number,
  condicao: number,
  fixas = 0,
): number {
  const config = LOTTERY_CONFIGS[lottery];
  const universo = config.totalNumbers;
  const sorteadas = config.minSelection;
  const outras = totalSelecionadas - fixas;
  let favoraveis = 0;
  for (let j = condicao - fixas; j <= Math.min(outras, sorteadas - fixas); j++) {
    favoraveis +=
      combinations(outras, j) * combinations(universo - totalSelecionadas, sorteadas - fixas - j);
  }
  const porSorteio = favoraveis / combinations(universo, sorteadas);
  return config.hasSecondDraw ? 1 - (1 - porSorteio) ** 2 : porSorteio;
}

function buildPlan(plano: PlanoGerado): FechamentoPlan {
  const config = LOTTERY_CONFIGS[plano.lottery];
  const custoPorBilhete = officialBetPrice(plano.lottery, plano.numbersPerTicket);
  const totalCost = Math.round(plano.ticketsCount * custoPorBilhete * 100) / 100;
  const comparisonCostFull = officialBetPrice(plano.lottery, plano.totalSelectedNumbers);

  const faixa = tierLabel(plano.lottery, plano.guaranteedHit);
  const dezenasSorteadas = config.minSelection;
  const fixas = plano.fixas ?? 0;
  const outras = plano.totalSelectedNumbers - fixas;
  const rotuloFixas = fixas === 1 ? '1 fixa' : `${fixas} fixas`;

  const description =
    fixas > 0
      ? `Escolha ${rotuloFixas} e mais ${outras} dezenas. Se ${fixas === 1 ? 'a fixa for sorteada' : 'as fixas forem sorteadas'} ` +
        `e mais ${plano.conditionHit - fixas} das sorteadas estiverem entre as outras ${outras}, pelo menos um dos ` +
        `${plano.ticketsCount} bilhetes fecha ${plano.guaranteedHit} acertos (${faixa}). ` +
        `Se ${fixas === 1 ? 'a fixa não sair' : 'alguma fixa não sair'}, não há garantia.`
      : `Marque ${plano.totalSelectedNumbers} dezenas. Se ${plano.conditionHit} das ${dezenasSorteadas} ` +
        `sorteadas estiverem entre elas, pelo menos um dos ${plano.ticketsCount} bilhetes fecha ` +
        `${plano.guaranteedHit} acertos (${faixa}). Garantia conferida cenário a cenário.`;

  return {
    id: plano.id,
    lottery: plano.lottery,
    name:
      fixas > 0
        ? `${config.name} ${plano.totalSelectedNumbers} Dezenas (${rotuloFixas}) — garante ${faixa}`
        : `${config.name} ${plano.totalSelectedNumbers} Dezenas — garante ${faixa}`,
    description,
    fixedCount: fixas,
    chanceGarantia: chanceDaGarantia(
      plano.lottery,
      plano.totalSelectedNumbers,
      plano.conditionHit,
      fixas,
    ),
    totalSelectedNumbers: plano.totalSelectedNumbers,
    numbersPerTicket: plano.numbersPerTicket,
    guaranteedHit: plano.guaranteedHit,
    conditionHit: plano.conditionHit,
    ticketsCount: plano.ticketsCount,
    totalCost,
    comparisonCostFull,
    savingsPercent: savingsPercent(comparisonCostFull, totalCost),
    matrices: plano.matrices,
  };
}

export const FECHAMENTOS_CATALOG: FechamentoPlan[] = (
  fechamentosGerados.planos as PlanoGerado[]
)
  .map(buildPlan)
  // Mais barato primeiro: é o que a maioria consegue realmente jogar.
  .sort((a, b) => a.totalCost - b.totalCost);

export function getFechamentosByLottery(lottery: LotteryType): FechamentoPlan[] {
  return FECHAMENTOS_CATALOG.filter((f) => f.lottery === lottery);
}

/**
 * Confere a garantia de um plano em tempo de execução.
 * Serve de rede de segurança caso o catálogo seja editado à mão algum dia.
 */
export function verifyFechamento(plan: FechamentoPlan): { ok: boolean; piorCaso: number } {
  const matrices = plan.matrices ?? [];
  if (matrices.length === 0) return { ok: false, piorCaso: 0 };

  // Com dezenas fixas a garantia só vale nos cenários em que todas elas saem.
  const fixas = plan.fixedCount ?? 0;
  const indices = Array.from({ length: plan.totalSelectedNumbers - fixas }, (_, i) => i + fixas);
  let pior = Infinity;

  const combinar = (inicio: number, atual: number[]) => {
    if (atual.length === plan.conditionHit) {
      let melhor = 0;
      for (const bilhete of matrices) {
        const acertos = bilhete.filter((i) => atual.includes(i)).length;
        if (acertos > melhor) melhor = acertos;
      }
      if (melhor < pior) pior = melhor;
      return;
    }
    for (let i = inicio; i < indices.length; i++) {
      atual.push(indices[i]);
      combinar(i + 1, atual);
      atual.pop();
    }
  };

  combinar(0, Array.from({ length: fixas }, (_, i) => i));
  return { ok: pior >= plan.guaranteedHit, piorCaso: pior };
}

// Aplica a matriz de fechamento sobre as dezenas escolhidas pelo usuário
export function executeFechamento(
  plan: FechamentoPlan,
  selectedNumbers: number[],
  stats?: LotteryStats,
  /** Mês da Sorte / Trevos: obrigatórios no volante e iguais em todos os bilhetes. */
  extra?: LotteryExtraSelection,
  /** Dezenas fixas do plano; precisam estar entre as `selectedNumbers`. */
  fixedNumbers: number[] = [],
): GeneratedGame[] {
  if (selectedNumbers.length !== plan.totalSelectedNumbers) {
    throw new Error(
      `O plano "${plan.name}" requer exatamente ${plan.totalSelectedNumbers} dezenas selecionadas (você escolheu ${selectedNumbers.length}).`
    );
  }

  const fixasDoPlano = plan.fixedCount ?? 0;
  const fixas = [...new Set(fixedNumbers)].filter((n) => selectedNumbers.includes(n));
  if (fixas.length !== fixasDoPlano) {
    throw new Error(
      `O plano "${plan.name}" usa ${fixasDoPlano} dezena(s) fixa(s) (você marcou ${fixas.length}).`
    );
  }

  const outras = [...selectedNumbers].filter((n) => !fixas.includes(n)).sort((a, b) => a - b);
  const matrices = plan.matrices || [];
  const ordem = ordenarContraDivisao(
    plan.lottery,
    [...fixas.sort((a, b) => a - b), ...outras],
    matrices,
    fixasDoPlano,
    stats?.ultimoConcurso?.dezenas,
  );
  const costPerTicket = officialBetPrice(plan.lottery, plan.numbersPerTicket, extra?.trevos?.length);

  return matrices.map((matrixIndices, index) => {
    const ticketNumbers = matrixIndices
      .map((idx) => ordem[idx])
      .filter((n) => n !== undefined)
      .sort((a, b) => a - b);

    const analysis = analyzeGame(plan.lottery, ticketNumbers, stats);
    const { score, label } = computeGameScore(analysis);
    const popularidade = popularidadeDoJogo(
      plan.lottery,
      ticketNumbers,
      stats?.ultimoConcurso?.dezenas,
    );

    return {
      id: `fechamento_${plan.id}_${index + 1}_${Date.now()}`,
      lottery: plan.lottery,
      numbers: ticketNumbers,
      extra,
      strategy: 'balanced',
      strategyLabel: `Fechamento: ${plan.name} (#${index + 1})`,
      createdAt: new Date().toISOString(),
      cost: costPerTicket,
      score,
      scoreLabel: label,
      analysis,
      popularidade,
      name: `Bilhete ${index + 1}/${matrices.length}`,
    };
  });
}
