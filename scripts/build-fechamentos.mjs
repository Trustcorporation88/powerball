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

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '..', 'src', 'data', 'fechamentos.json');

/**
 * Coberturas publicadas no La Jolla Covering Repository (dmgordon.org/cover),
 * indexadas por `pool-bilhete-condicao-garantia`. Só entram se passarem pela
 * mesma conferência por força bruta e forem menores que a da busca local.
 */
const PUBLICADAS = JSON.parse(
  await readFile(resolve(__dirname, 'coberturas-publicadas.json'), 'utf8'),
);

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
  { lottery: 'megasena', pool: 8, ticket: 6, condicao: 4, garantia: 4 },
  { lottery: 'megasena', pool: 8, ticket: 6, condicao: 5, garantia: 5 },
  { lottery: 'megasena', pool: 9, ticket: 6, condicao: 4, garantia: 4 },
  { lottery: 'megasena', pool: 10, ticket: 6, condicao: 4, garantia: 4 },
  { lottery: 'megasena', pool: 11, ticket: 6, condicao: 4, garantia: 4 },
  { lottery: 'megasena', pool: 12, ticket: 6, condicao: 4, garantia: 4 },
  { lottery: 'megasena', pool: 13, ticket: 6, condicao: 4, garantia: 4 },

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

/** Bilhetes que cumprem a garantia em cada cenário, por índice do bilhete. */
function mapaDeCobertura(blocos, cenarios, garantia) {
  return blocos.map((bloco) => {
    const lista = [];
    for (let c = 0; c < cenarios.length; c++) {
      if (popcount(bloco & cenarios[c]) >= garantia) lista.push(c);
    }
    return Int32Array.from(lista);
  });
}

/**
 * Recozimento simulado: tenta cobrir todos os cenários com `alvo` bilhetes,
 * trocando uma dezena por vez. Devolve as máscaras ou null se o tempo acabar.
 */
function recozer(pool, cenarios, cobre, indiceDoBloco, inicial, alvo, prazo) {
  const todos = [...indiceDoBloco.keys()];
  const estado = inicial.slice(0, alvo);
  while (estado.length < alvo) estado.push(todos[Math.floor(Math.random() * todos.length)]);

  const contagem = new Int32Array(cenarios.length);
  for (const bloco of estado) for (const c of cobre[indiceDoBloco.get(bloco)]) contagem[c]++;
  let descobertos = 0;
  for (const valor of contagem) if (valor === 0) descobertos++;

  let temperatura = 0.6;
  let passos = 0;
  while (descobertos > 0) {
    if ((++passos & 4095) === 0) {
      if (Date.now() > prazo) return null;
      temperatura = Math.max(0.05, temperatura * 0.997);
    }
    const pos = Math.floor(Math.random() * alvo);
    const velho = estado[pos];
    const dentro = maskToIndices(velho, pool);
    const fora = [];
    for (let i = 0; i < pool; i++) if (!(velho & (1 << i))) fora.push(i);
    const novo =
      (velho & ~(1 << dentro[Math.floor(Math.random() * dentro.length)])) |
      (1 << fora[Math.floor(Math.random() * fora.length)]);

    const listaVelha = cobre[indiceDoBloco.get(velho)];
    const listaNova = cobre[indiceDoBloco.get(novo)];
    let saldo = 0;
    for (const c of listaVelha) if (--contagem[c] === 0) saldo++;
    for (const c of listaNova) if (contagem[c]++ === 0) saldo--;

    if (saldo <= 0 || Math.random() < Math.exp(-saldo / temperatura)) {
      estado[pos] = novo;
      descobertos += saldo;
    } else {
      for (const c of listaNova) contagem[c]--;
      for (const c of listaVelha) contagem[c]++;
    }
  }
  return estado;
}

/**
 * Depois da gulosa, tenta tirar um bilhete por vez mantendo a garantia.
 * Para quando o recozimento não acha cobertura menor dentro do prazo.
 */
function encolher(pool, ticket, condicao, garantia, inicial, orcamentoMs) {
  const blocos = subsetMasks(pool, ticket);
  const cenarios = subsetMasks(pool, condicao);
  if (blocos.length * cenarios.length > 30_000_000) return inicial;

  const cobre = mapaDeCobertura(blocos, cenarios, garantia);
  const indiceDoBloco = new Map(blocos.map((bloco, i) => [bloco, i]));
  const prazoFinal = Date.now() + orcamentoMs;

  let melhor = inicial;
  while (Date.now() < prazoFinal && melhor.length > 1) {
    const alvo = melhor.length - 1;
    let achado = null;
    for (let tentativa = 0; tentativa < 6 && !achado && Date.now() < prazoFinal; tentativa++) {
      const prazo = Math.min(prazoFinal, Date.now() + orcamentoMs / 6);
      const embaralhado = [...melhor].sort(() => Math.random() - 0.5);
      achado = recozer(pool, cenarios, cobre, indiceDoBloco, embaralhado, alvo, prazo);
    }
    if (!achado || !verify(achado, pool, condicao, garantia).ok) break;
    melhor = achado;
  }
  return melhor;
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

    let enxuto = encolher(pool, ticket, condicao, garantia, prune(melhor, pool, condicao, garantia), 20_000);

    const publicado = PUBLICADAS[`${pool}-${ticket}-${condicao}-${garantia}`];
    if (publicado && publicado.blocos.length < enxuto.length) {
      const mascaras = publicado.blocos.map((bloco) => bloco.reduce((m, i) => m | (1 << i), 0));
      if (verify(mascaras, pool, condicao, garantia).ok) enxuto = mascaras;
    }

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
