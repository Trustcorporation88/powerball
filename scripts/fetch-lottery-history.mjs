#!/usr/bin/env node
/**
 * Gera a base histórica embarcada das loterias da Caixa.
 *
 * Executar: `node scripts/fetch-lottery-history.mjs`
 *
 * Os arquivos gerados em `src/data/history/` são o último elo da cadeia de
 * fallback do app (proxy próprio -> Caixa -> espelho público -> base embarcada),
 * garantindo que as estatísticas continuem confiáveis mesmo totalmente offline.
 *
 * O formato é propositalmente compacto (uma string por concurso) porque a base
 * vai para dentro do bundle: em JSON estruturado os mesmos dados ocupariam
 * cerca de 6x mais espaço.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, '..', 'src', 'data', 'history');

const MIRROR_BASE = 'https://loteriascaixa-api.herokuapp.com/api';

/**
 * Quantos concursos embarcar por modalidade. Acima de ~1000 concursos o ganho
 * estatístico é marginal e o custo de bundle deixa de compensar.
 */
const TARGETS = [
  { lottery: 'megasena', limit: 1000 },
  { lottery: 'lotofacil', limit: 1000 },
  { lottery: 'quina', limit: 1000 },
  { lottery: 'duplasena', limit: 800 },
  { lottery: 'diadesorte', limit: 800 },
  { lottery: 'maismilionaria', limit: 400 },
];

function toNumbers(list) {
  return (list ?? [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
}

/**
 * Serializa um concurso como `concurso|data|dezenas[|extra]`.
 * O campo extra carrega o 2º sorteio (Dupla Sena), o mês da sorte
 * (Dia de Sorte) ou os trevos (+Milionária).
 */
function encodeDraw(lottery, raw) {
  const concurso = Number(raw.concurso);
  const data = String(raw.data ?? '').trim();
  const dezenas = toNumbers(raw.dezenas);

  if (!Number.isFinite(concurso) || dezenas.length === 0) return null;

  const base = `${concurso}|${data}|${dezenas.join(',')}`;

  if (lottery === 'duplasena') {
    const segundo = toNumbers(raw.dezenasSegundoSorteio ?? raw.listaDezenasSegundoSorteio);
    return segundo.length > 0 ? `${base}|${segundo.join(',')}` : base;
  }

  if (lottery === 'diadesorte') {
    const mes = String(raw.mesSorte ?? raw.mesDaSorte ?? '').trim();
    return mes ? `${base}|${mes}` : base;
  }

  if (lottery === 'maismilionaria') {
    const trevos = toNumbers(raw.trevos);
    return trevos.length > 0 ? `${base}|${trevos.join(',')}` : base;
  }

  return base;
}

async function fetchHistory(lottery) {
  const response = await fetch(`${MIRROR_BASE}/${lottery}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao buscar ${lottery}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error(`Resposta inesperada para ${lottery}`);
  }

  return payload;
}

async function buildLottery({ lottery, limit }) {
  const payload = await fetchHistory(lottery);

  const draws = payload
    .slice()
    .sort((a, b) => Number(b.concurso) - Number(a.concurso))
    .slice(0, limit)
    .map((raw) => encodeDraw(lottery, raw))
    .filter(Boolean);

  if (draws.length === 0) {
    throw new Error(`Nenhum concurso válido para ${lottery}`);
  }

  const file = {
    lottery,
    // Atualizado por `scripts/fetch-lottery-history.mjs`.
    generatedAt: new Date().toISOString(),
    total: draws.length,
    firstConcurso: Number(draws[draws.length - 1].split('|')[0]),
    lastConcurso: Number(draws[0].split('|')[0]),
    draws,
  };

  const target = resolve(OUTPUT_DIR, `${lottery}.json`);
  await writeFile(target, `${JSON.stringify(file)}\n`, 'utf8');

  return file;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const target of TARGETS) {
    try {
      const file = await buildLottery(target);
      console.log(
        `[ok] ${file.lottery}: ${file.total} concursos (${file.firstConcurso} -> ${file.lastConcurso})`,
      );
    } catch (error) {
      console.error(`[erro] ${target.lottery}:`, error.message);
      process.exitCode = 1;
    }
  }
}

await main();
