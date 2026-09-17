/**
 * Validação do motor de loterias contra a base histórica real.
 *
 * Executar: `pnpm validate:loterias`
 *
 * Verifica invariantes que já quebraram na prática:
 *  - as tabelas de preço batem com a combinatória oficial da Caixa;
 *  - todo concurso tem exatamente a quantidade de dezenas da modalidade
 *    (foi assim que descobrimos que a Dupla Sena devolve os dois sorteios
 *    concatenados num array de 12);
 *  - o baseline aleatório do backtest converge para a expectativa teórica,
 *    o que prova que a simulação não está enxergando o futuro.
 */

import { readFileSync } from 'node:fs';

import { LOTTERY_CONFIGS, LOTTERY_ORDER, combinations } from '@/constants/lotteryConstants';
import { decodeDraw } from '@/data/lotteryHistory';
import { runBacktest } from '@/services/lotteryBacktest';
import { getFechamentosByLottery, verifyFechamento } from '@/services/lotteryFechamento';
import { generateLotteryGames } from '@/services/lotteryGenerator';
import { calculateLotteryStats } from '@/services/lotteryHistoricalData';
import { LotteryDraw, LotteryType } from '@/types/lottery';

let falhas = 0;

function check(condicao: boolean, descricao: string, detalhe = ''): void {
  if (condicao) {
    console.log(`  ok    ${descricao}`);
  } else {
    falhas++;
    console.error(`  FALHA ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  }
}

function loadHistory(lottery: LotteryType): LotteryDraw[] {
  const file = JSON.parse(readFileSync(`src/data/history/${lottery}.json`, 'utf8'));
  return (file.draws as string[])
    .map((encoded) => decodeDraw(lottery, encoded))
    .filter((draw): draw is LotteryDraw => draw !== null)
    .sort((a, b) => b.concurso - a.concurso);
}

async function main(): Promise<void> {
  for (const lottery of LOTTERY_ORDER) {
    const config = LOTTERY_CONFIGS[lottery];
    console.log(`\n### ${config.name}`);

    // 1. Tabela de preços x combinatória
    const divergencias = Object.entries(config.priceTable).filter(([dezenas, valor]) => {
      const esperado = combinations(Number(dezenas), config.minSelection) * config.basePrice;
      return Math.abs(esperado - valor) > 0.01;
    });
    check(
      divergencias.length === 0,
      'tabela de preços confere com a combinatória oficial',
      divergencias.map(([d, v]) => `${d} dezenas = R$ ${v}`).join(', '),
    );

    // 2. Integridade do histórico
    const draws = loadHistory(lottery);
    check(draws.length >= 300, `histórico carregado (${draws.length} concursos)`);

    const tamanhoErrado = draws.filter((d) => d.dezenas.length !== config.minSelection);
    check(
      tamanhoErrado.length === 0,
      `todo concurso tem ${config.minSelection} dezenas`,
      tamanhoErrado
        .slice(0, 3)
        .map((d) => `concurso ${d.concurso} com ${d.dezenas.length}`)
        .join(', '),
    );

    const foraDoIntervalo = draws.filter((d) =>
      d.dezenas.some((n) => n < 1 || n > config.totalNumbers),
    );
    check(foraDoIntervalo.length === 0, `dezenas dentro de 1..${config.totalNumbers}`);

    if (config.hasSecondDraw) {
      const semSegundo = draws.filter(
        (d) => d.dezenasSegundoSorteio?.length !== config.minSelection,
      );
      check(semSegundo.length === 0, 'todo concurso tem o 2º sorteio separado');
    }

    // 3. Geração de bilhetes
    const stats = calculateLotteryStats(lottery, draws);
    const games = generateLotteryGames(
      lottery,
      {
        strategy: 'ai_smart',
        numbersCount: config.minSelection,
        fixedNumbers: [],
        excludedNumbers: [],
        gamesCount: 3,
      },
      stats,
    );
    check(games.length === 3, 'gerador devolve a quantidade pedida de bilhetes');
    check(
      games.every((g) => new Set(g.numbers).size === config.minSelection),
      'bilhetes sem dezenas repetidas',
    );
    check(
      !config.extraField || games.every((g) => g.extra !== undefined),
      'campo extra preenchido (Mês da Sorte / Trevos)',
    );

    // 4. Fechamentos: nenhuma garantia pode ser anunciada sem se sustentar
    const fechamentos = getFechamentosByLottery(lottery);
    check(fechamentos.length > 0, `catálogo de fechamentos disponível (${fechamentos.length})`);

    const mentirosos = fechamentos.filter((plano) => !verifyFechamento(plano).ok);
    check(
      mentirosos.length === 0,
      'toda garantia de fechamento se confirma no pior caso',
      mentirosos
        .map((p) => `${p.id} entrega ${verifyFechamento(p).piorCaso} e promete ${p.guaranteedHit}`)
        .join('; '),
    );

    const custosErrados = fechamentos.filter(
      (plano) =>
        Math.abs(plano.totalCost - plano.ticketsCount * config.priceTable[plano.numbersPerTicket]) >
        0.01,
    );
    check(custosErrados.length === 0, 'custo do fechamento bate com a tabela oficial');

    // 5. Backtest sem lookahead: o aleatório tem que convergir para a teoria
    const report = await runBacktest({
      lottery,
      draws,
      strategies: ['ai_smart', 'hot', 'cold', 'balanced'],
      janela: 80,
      ticketsPorConcurso: 3,
    });

    const desvio = Math.abs(report.baselineAleatorio - report.esperancaTeorica);
    const tolerancia = Math.max(0.12, report.esperancaTeorica * 0.18);
    check(
      desvio <= tolerancia,
      `baseline aleatório (${report.baselineAleatorio}) converge para a esperança teórica (${report.esperancaTeorica})`,
      `desvio ${desvio.toFixed(3)} acima da tolerância ${tolerancia.toFixed(3)}`,
    );

    const melhor = report.resultados[0];
    console.log(
      `  info  melhor estratégia na janela: ${melhor.strategy} (${melhor.mediaAcertos} acertos médios, ${melhor.vantagemSobreAleatorio >= 0 ? '+' : ''}${melhor.vantagemSobreAleatorio} vs aleatório)`,
    );
  }

  console.log(
    falhas === 0
      ? '\nTodas as verificações passaram.'
      : `\n${falhas} verificação(ões) falharam.`,
  );
  process.exit(falhas === 0 ? 0 : 1);
}

void main();
