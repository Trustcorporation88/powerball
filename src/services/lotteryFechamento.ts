import { FechamentoPlan, GeneratedGame, LotteryStats, LotteryType } from '@/types/lottery';
import { LOTTERY_CONFIGS, officialBetPrice, savingsPercent } from '@/constants/lotteryConstants';
import fechamentosGerados from '@/data/fechamentos.json';
import { analyzeGame, computeGameScore } from './lotteryGenerator';

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
}

/** Nome da faixa premiada correspondente ao número de acertos. */
function tierLabel(lottery: LotteryType, hits: number): string {
  const tier = LOTTERY_CONFIGS[lottery].prizeTiers.find((t) => t.hits === hits);
  return tier?.label ?? `${hits} acertos`;
}

function buildPlan(plano: PlanoGerado): FechamentoPlan {
  const config = LOTTERY_CONFIGS[plano.lottery];
  const custoPorBilhete = officialBetPrice(plano.lottery, plano.numbersPerTicket);
  const totalCost = Math.round(plano.ticketsCount * custoPorBilhete * 100) / 100;
  const comparisonCostFull = officialBetPrice(plano.lottery, plano.totalSelectedNumbers);

  const faixa = tierLabel(plano.lottery, plano.guaranteedHit);
  const dezenasSorteadas = config.minSelection;

  return {
    id: plano.id,
    lottery: plano.lottery,
    name: `${config.name} ${plano.totalSelectedNumbers} Dezenas — garante ${faixa}`,
    description:
      `Marque ${plano.totalSelectedNumbers} dezenas. Se ${plano.conditionHit} das ${dezenasSorteadas} ` +
      `sorteadas estiverem entre elas, pelo menos um dos ${plano.ticketsCount} bilhetes fecha ` +
      `${plano.guaranteedHit} acertos (${faixa}). Garantia conferida cenário a cenário.`,
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

  const indices = Array.from({ length: plan.totalSelectedNumbers }, (_, i) => i);
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

  combinar(0, []);
  return { ok: pior >= plan.guaranteedHit, piorCaso: pior };
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
  const costPerTicket = officialBetPrice(plan.lottery, plan.numbersPerTicket);

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
