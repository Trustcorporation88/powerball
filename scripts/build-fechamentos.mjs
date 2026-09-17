#!/usr/bin/env node
/**
 * Constrói e verifica as matrizes de fechamento (covering designs).
 *
 * Executar: `pnpm fechamentos:gerar`
 *
 * Um fechamento só pode anunciar "garantia matemática" se, para TODO cenário
 * possível, algum bilhete atingir a faixa prometida. Aqui a matriz é montada
 * por busca gulosa e depois conferida por força bruta sobre todos os cenários
 * — a garantia gravada no catálogo é a verificada, nunca a desejada.
 *
 * As matrizes anteriores, escritas à mão, prometiam garantias que não
 * entregavam (a de 10 dezenas da Mega-Sena anunciava Quadra e no pior caso
 * fazia Terno), por isso este passo virou parte do build.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '..', 'src', 'data', 'fechamentos.json');

/**
 * Cada especificação descreve: com `pool` dezenas marcadas, bilhetes de
 * `ticket` dezenas, SE `condicao` dezenas sorteadas estiverem no pool, ENTÃO
 * algum bilhete terá pelo menos `garantia` acertos.
 */
const SPECS = [
  // Lotofácil — 15 dezenas sorteadas, bilhete mínimo de 15
  { lottery: 'lotofacil', pool: 16, ticket: 15, condicao: 15, garantia: 15 },
  { lottery: 'lotofacil', pool: 17, ticket: 15, condicao: 15, garantia: 14 },
  { lottery: 'lotofacil', pool: 18, ticket: 15, condicao: 15, garantia: 14 },
  { lottery: 'lotofacil', pool: 18, ticket: 15, condicao: 14, garantia: 13 },
  { lottery: 'lotofacil', pool: 20, ticket: 15, condicao: 15, garantia: 13 },

  // Mega-Sena — 6 dezenas sorteadas
  { lottery: 'megasena', pool: 7, ticket: 6, condicao: 4, garantia: 4 },
  { lottery: 'megasena', pool: 8, ticket: 6, condicao: 5, garantia: 5 },
  { lottery: 'megasena', pool: 9, ticket: 6, condicao: 4, garantia: 4 },
  { lottery: 'megasena', pool: 10, ticket: 6, condicao: 4, garantia: 4 },
  { lottery: 'megasena', pool: 12, ticket: 6, condicao: 4, garantia: 4 },

  // Quina — 5 dezenas sorteadas
  { lottery: 'quina', pool: 7, ticket: 5, condicao: 3, garantia: 3 },
  { lottery: 'quina', pool: 8, ticket: 5, condicao: 4, garantia: 4 },
  { lottery: 'quina', pool: 10, ticket: 5, condicao: 3, garantia: 3 },

  // Dupla Sena — 6 dezenas por sorteio
  { lottery: 'duplasena', pool: 8, ticket: 6, condicao: 4, garantia: 4 },
  { lottery: 'duplasena', pool: 10, ticket: 6, condicao: 4, garantia: 4 },

  // Dia de Sorte — 7 dezenas sorteadas
  { lottery: 'diadesorte', pool: 9, ticket: 7, condicao: 5, garantia: 5 },
  { lottery: 'diadesorte', pool: 10, ticket: 7, condicao: 5, garantia: 5 },

  // +Milionária — 6 dezenas sorteadas
  { lottery: 'maismilionaria', pool: 8, ticket: 6, condicao: 4, garantia: 4 },
];

function popcount(value) {
  let v = value - ((value >> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
  return (((v + (v >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
}

function subsetMasks(n, r) {
  const masks = [];
  const idx = Array.from({ length: r }, (_, i) => i);

  for (;;) {
    let mask = 0;
    for (const i of idx) mask |= 1 << i;
    masks.push(mask);

    let i = r - 1;
    while (i >= 0 && idx[i] === n - r + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < r; j++) idx[j] = idx[j - 1] + 1;
  }

  return masks;
}

function maskToIndices(mask, n) {
  const out = [];
  for (let i = 0; i < n; i++) if (mask & (1 << i)) out.push(i);
  return out;
}

/** Cobertura gulosa: a cada passo escolhe o bilhete que cobre mais cenários pendentes. */
function greedyCover(pool, ticket, condicao, garantia, embaralhar) {
  const blocos = subsetMasks(pool, ticket);
  const cenarios = subsetMasks(pool, condicao);

  let pendentes = cenarios;
  const escolhidos = [];

  // Empates resolvidos ao acaso geram soluções diferentes entre as tentativas.
  const ordem = blocos.map((bloco, i) => ({ bloco, chave: embaralhar ? Math.random() : i }));
  ordem.sort((a, b) => a.chave - b.chave);

  while (pendentes.length > 0) {
    let melhorBloco = 0;
    let melhorGanho = -1;

    for (const { bloco } of ordem) {
      let ganho = 0;
      for (const cenario of pendentes) {
        if (popcount(bloco & cenario) >= garantia) ganho++;
      }
      if (ganho > melhorGanho) {
        melhorGanho = ganho;
        melhorBloco = bloco;
      }
    }

    if (melhorGanho <= 0) return null; // Garantia impossível com este formato
    escolhidos.push(melhorBloco);
    pendentes = pendentes.filter((cenario) => popcount(melhorBloco & cenario) < garantia);
  }

  return escolhidos;
}

/** Confere por força bruta que todo cenário possível atinge a garantia. */
function verify(blocos, pool, condicao, garantia) {
  const cenarios = subsetMasks(pool, condicao);
  let pior = Infinity;

  for (const cenario of cenarios) {
    let melhor = 0;
    for (const bloco of blocos) {
      const acertos = popcount(bloco & cenario);
      if (acertos > melhor) melhor = acertos;
    }
    if (melhor < pior) pior = melhor;
  }

  return { ok: pior >= garantia, pior, cenariosTestados: cenarios.length };
}

/** Remove bilhetes que se tornaram redundantes ao longo da busca gulosa. */
function prune(blocos, pool, condicao, garantia) {
  let atual = [...blocos];

  for (let i = atual.length - 1; i >= 0; i--) {
    const candidato = atual.filter((_, idx) => idx !== i);
    if (candidato.length > 0 && verify(candidato, pool, condicao, garantia).ok) {
      atual = candidato;
    }
  }

  return atual;
}

async function main() {
  const planos = [];

  for (const spec of SPECS) {
    const { lottery, pool, ticket, condicao, garantia } = spec;
    const tentativas = pool >= 20 ? 1 : 6;

    let melhor = null;
    for (let t = 0; t < tentativas; t++) {
      const solucao = greedyCover(pool, ticket, condicao, garantia, t > 0);
      if (solucao && (!melhor || solucao.length < melhor.length)) melhor = solucao;
    }

    if (!melhor) {
      console.error(`[erro] ${lottery} ${pool}/${ticket}: garantia ${garantia} inalcançável`);
      continue;
    }

    const enxuto = prune(melhor, pool, condicao, garantia);
    const conferencia = verify(enxuto, pool, condicao, garantia);

    if (!conferencia.ok) {
      console.error(`[erro] ${lottery} ${pool}/${ticket}: verificação falhou`);
      continue;
    }

    planos.push({
      id: `${lottery}-${pool}-${condicao}-${garantia}`,
      lottery,
      totalSelectedNumbers: pool,
      numbersPerTicket: ticket,
      conditionHit: condicao,
      guaranteedHit: garantia,
      ticketsCount: enxuto.length,
      matrices: enxuto.map((bloco) => maskToIndices(bloco, pool)),
    });

    console.log(
      `[ok] ${lottery.padEnd(15)} ${pool} dezenas -> ${enxuto.length} bilhetes de ${ticket} ` +
        `| garante ${garantia} acertos se ${condicao} caírem no pool ` +
        `(${conferencia.cenariosTestados} cenários conferidos)`,
    );
  }

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(
    OUTPUT,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), planos }, null, 0)}\n`,
    'utf8',
  );

  console.log(`\n${planos.length} fechamentos verificados gravados em src/data/fechamentos.json`);
}

await main();
