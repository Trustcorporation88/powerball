#!/usr/bin/env node
/**
 * Gera `public/sitemap.xml` com as páginas públicas de resultado.
 *
 * Executar: `pnpm seo:sitemap` (o domínio vem de SITE_URL).
 *
 * Buscas por "resultado lotofácil 3058" são o tráfego mais barato que este
 * site pode captar, e cada concurso já tem URL própria. O sitemap só existe
 * para que o Google descubra essas URLs sem depender de links internos.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HISTORY_DIR = resolve(__dirname, '..', 'src', 'data', 'history');
const OUTPUT = resolve(__dirname, '..', 'public', 'sitemap.xml');

const SITE_URL = (process.env.SITE_URL ?? 'https://play.xbrex.com.br').replace(/\/+$/, '');

/** Quantos concursos recentes por modalidade entram no sitemap. */
const CONCURSOS_POR_MODALIDADE = 150;

const SLUGS = {
  lotofacil: 'lotofacil',
  megasena: 'mega-sena',
  quina: 'quina',
  duplasena: 'dupla-sena',
  diadesorte: 'dia-de-sorte',
  maismilionaria: 'mais-milionaria',
};

/** Converte "16/09/2026" no formato ISO exigido pelo sitemap. */
function toIsoDate(data) {
  const partes = String(data).split('/');
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes;
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

function url(loc, { lastmod, changefreq, priority }) {
  const linhas = [`    <loc>${loc}</loc>`];
  if (lastmod) linhas.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) linhas.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) linhas.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${linhas.join('\n')}\n  </url>`;
}

async function main() {
  const urls = [
    url(`${SITE_URL}/`, { changefreq: 'daily', priority: '1.0' }),
    url(`${SITE_URL}/loterias`, { changefreq: 'daily', priority: '0.9' }),
  ];

  for (const [lottery, slug] of Object.entries(SLUGS)) {
    let file;
    try {
      file = JSON.parse(await readFile(resolve(HISTORY_DIR, `${lottery}.json`), 'utf8'));
    } catch {
      console.warn(`[aviso] histórico de ${lottery} não encontrado, pulando`);
      continue;
    }

    const concursos = file.draws.slice(0, CONCURSOS_POR_MODALIDADE).map((linha) => {
      const [numero, data] = linha.split('|');
      return { numero: Number(numero), lastmod: toIsoDate(data) };
    });

    urls.push(
      url(`${SITE_URL}/resultado/${slug}`, {
        lastmod: concursos[0]?.lastmod ?? undefined,
        changefreq: 'daily',
        priority: '0.9',
      }),
    );

    for (const concurso of concursos) {
      urls.push(
        url(`${SITE_URL}/resultado/${slug}/${concurso.numero}`, {
          lastmod: concurso.lastmod ?? undefined,
          // Resultados passados não mudam; só a premiação é revisada logo após o sorteio.
          changefreq: 'monthly',
          priority: '0.6',
        }),
      );
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

  await writeFile(OUTPUT, xml, 'utf8');
  console.log(`sitemap.xml gerado com ${urls.length} URLs (${SITE_URL})`);
}

await main();
