import { prisma } from "./prisma.js";
import { type Lottery, NOMES, UNIVERSO, momentoDoSorteio } from "./lotteryData.js";

/**
 * Placar real das estratégias.
 *
 * Diferente da "Prova Real" (que simula no histórico), aqui só entram
 * bilhetes que chegaram ao servidor ANTES do sorteio para o qual foram
 * feitos, pelo relógio do servidor. Cada um é conferido contra o resultado
 * guardado no banco, sem confiar na conferência feita no navegador.
 *
 * A comparação honesta é com o acaso: a média de acertos que qualquer
 * bilhete do mesmo tamanho teria, calculada pela distribuição
 * hipergeométrica.
 */

function logFatorial(n: number): number {
  let soma = 0;
  for (let i = 2; i <= n; i++) soma += Math.log(i);
  return soma;
}

function logCombinacao(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  return logFatorial(n) - logFatorial(k) - logFatorial(n - k);
}

/** P(X = k) ao escolher `escolhidas` dezenas num universo com `sorteadas` sorteadas. */
function hipergeometrica(total: number, sorteadas: number, escolhidas: number, k: number): number {
  return Math.exp(
    logCombinacao(sorteadas, k) +
      logCombinacao(total - sorteadas, escolhidas - k) -
      logCombinacao(total, escolhidas),
  );
}

const esperancaCache = new Map<string, number>();

/** Acertos médios esperados ao acaso; na Dupla Sena vale o melhor dos dois sorteios. */
export function esperancaAoAcaso(lottery: Lottery, escolhidas: number): number {
  const chave = `${lottery}:${escolhidas}`;
  const cache = esperancaCache.get(chave);
  if (cache !== undefined) return cache;

  const { total, sorteadas, doisSorteios } = UNIVERSO[lottery];
  const maximo = Math.min(sorteadas, escolhidas);

  let esperanca = 0;
  if (!doisSorteios) {
    esperanca = (escolhidas * sorteadas) / total;
  } else {
    // E[max(X1, X2)] = soma de P(max >= k) = soma de 1 - P(X < k)^2
    let acumulada = 0;
    for (let k = 1; k <= maximo; k++) {
      acumulada += hipergeometrica(total, sorteadas, escolhidas, k - 1);
      esperanca += 1 - acumulada * acumulada;
    }
  }

  esperancaCache.set(chave, esperanca);
  return esperanca;
}

export interface PlacarEstrategia {
  strategy: string;
  strategyLabel: string;
  bilhetes: number;
  concursos: number;
  mediaAcertos: number;
  mediaEsperada: number;
  /** Média real menos a esperada ao acaso. */
  diferenca: number;
  melhorAcerto: number;
  /** acertos -> quantidade de bilhetes */
  distribuicao: Record<number, number>;
}

export interface RelatorioTransparencia {
  lottery: Lottery;
  nome: string;
  geradoEm: string;
  bilhetesConferidos: number;
  /** Gravados depois do horário do sorteio: não contam. */
  bilhetesDescartados: number;
  bilhetesAguardando: number;
  usuarios: number;
  concursos: number;
  primeiroConcurso: number | null;
  ultimoConcurso: number | null;
  estrategias: PlacarEstrategia[];
}

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<Lottery, { em: number; relatorio: RelatorioTransparencia }>();

export async function relatorioTransparencia(lottery: Lottery): Promise<RelatorioTransparencia> {
  const guardado = cache.get(lottery);
  if (guardado && Date.now() - guardado.em < CACHE_MS) return guardado.relatorio;

  const bilhetes = await prisma.lotteryWalletGame.findMany({
    where: { lottery, concursoAlvo: { not: null } },
    select: {
      userId: true,
      numbers: true,
      strategy: true,
      strategyLabel: true,
      concursoAlvo: true,
      registradoEm: true,
    },
  });

  const alvos = Array.from(new Set(bilhetes.map((bilhete) => bilhete.concursoAlvo as number)));
  const sorteios = await prisma.lotteryDrawCache.findMany({
    where: { lottery, concurso: { in: alvos } },
    select: { concurso: true, data: true, dezenas: true, dezenas2: true },
  });
  const porConcurso = new Map(sorteios.map((sorteio) => [sorteio.concurso, sorteio]));

  interface Acumulador {
    strategyLabel: string;
    bilhetes: number;
    somaAcertos: number;
    somaEsperada: number;
    melhor: number;
    concursos: Set<number>;
    distribuicao: Record<number, number>;
  }

  const porEstrategia = new Map<string, Acumulador>();
  const usuarios = new Set<string>();
  const concursosConferidos = new Set<number>();
  let conferidos = 0;
  let descartados = 0;
  let aguardando = 0;

  for (const bilhete of bilhetes) {
    const alvo = bilhete.concursoAlvo as number;
    const sorteio = porConcurso.get(alvo);
    if (!sorteio) {
      aguardando++;
      continue;
    }

    const momento = momentoDoSorteio(sorteio.data);
    if (momento === null || bilhete.registradoEm.getTime() >= momento) {
      descartados++;
      continue;
    }

    const numeros = Array.isArray(bilhete.numbers) ? (bilhete.numbers as number[]) : [];
    if (numeros.length === 0) continue;

    const primeiro = new Set(Array.isArray(sorteio.dezenas) ? (sorteio.dezenas as number[]) : []);
    const segundo = new Set(Array.isArray(sorteio.dezenas2) ? (sorteio.dezenas2 as number[]) : []);
    let acertos = numeros.filter((n) => primeiro.has(n)).length;
    if (UNIVERSO[lottery].doisSorteios && segundo.size > 0) {
      acertos = Math.max(acertos, numeros.filter((n) => segundo.has(n)).length);
    }

    const acumulador = porEstrategia.get(bilhete.strategy) ?? {
      strategyLabel: bilhete.strategyLabel,
      bilhetes: 0,
      somaAcertos: 0,
      somaEsperada: 0,
      melhor: 0,
      concursos: new Set<number>(),
      distribuicao: {},
    };

    acumulador.bilhetes++;
    acumulador.somaAcertos += acertos;
    acumulador.somaEsperada += esperancaAoAcaso(lottery, numeros.length);
    acumulador.melhor = Math.max(acumulador.melhor, acertos);
    acumulador.concursos.add(alvo);
    acumulador.distribuicao[acertos] = (acumulador.distribuicao[acertos] ?? 0) + 1;
    porEstrategia.set(bilhete.strategy, acumulador);

    usuarios.add(bilhete.userId);
    concursosConferidos.add(alvo);
    conferidos++;
  }

  const arredondar = (valor: number) => Math.round(valor * 1000) / 1000;

  const estrategias: PlacarEstrategia[] = Array.from(porEstrategia.entries())
    .map(([strategy, acumulador]) => {
      const media = acumulador.somaAcertos / acumulador.bilhetes;
      const esperada = acumulador.somaEsperada / acumulador.bilhetes;
      return {
        strategy,
        strategyLabel: acumulador.strategyLabel,
        bilhetes: acumulador.bilhetes,
        concursos: acumulador.concursos.size,
        mediaAcertos: arredondar(media),
        mediaEsperada: arredondar(esperada),
        diferenca: arredondar(media - esperada),
        melhorAcerto: acumulador.melhor,
        distribuicao: acumulador.distribuicao,
      };
    })
    .sort((a, b) => b.bilhetes - a.bilhetes);

  const lista = Array.from(concursosConferidos);
  const relatorio: RelatorioTransparencia = {
    lottery,
    nome: NOMES[lottery],
    geradoEm: new Date().toISOString(),
    bilhetesConferidos: conferidos,
    bilhetesDescartados: descartados,
    bilhetesAguardando: aguardando,
    usuarios: usuarios.size,
    concursos: lista.length,
    primeiroConcurso: lista.length ? Math.min(...lista) : null,
    ultimoConcurso: lista.length ? Math.max(...lista) : null,
    estrategias,
  };

  cache.set(lottery, { em: Date.now(), relatorio });
  return relatorio;
}
