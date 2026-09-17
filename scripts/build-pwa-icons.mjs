#!/usr/bin/env node
/**
 * Gera os ícones PNG do PWA.
 *
 * Executar: `pnpm pwa:icones`
 *
 * O ambiente de build não tem ImageMagick nem sharp, e um ícone é simples o
 * bastante para ser rasterizado aqui: fundo na cor da Lotofácil e um trevo de
 * quatro folhas desenhado a partir de círculos. A renderização é feita em 4x e
 * reduzida no fim, o que resolve o serrilhado sem precisar de biblioteca.
 */

import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, '..', 'public', 'icons');

const SUPERSAMPLE = 4;

const ROXO = [147, 51, 234];
const ROXO_ESCURO = [109, 40, 217];
const BRANCO = [255, 255, 255];

/* ------------------------------------------------------------------ *
 * Codificador PNG mínimo (RGBA, sem filtros)
 * ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(tipo, dados) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);

  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));

  return Buffer.concat([tamanho, corpo, crc]);
}

function encodePng(width, height, rgba) {
  const assinatura = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Cada linha é precedida pelo byte de filtro (0 = nenhum).
  const bruto = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const destino = y * (width * 4 + 1);
    bruto[destino] = 0;
    rgba.copy(bruto, destino + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    assinatura,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(bruto, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ *
 * Desenho
 * ------------------------------------------------------------------ */

function misturar(base, cor, alpha) {
  return [
    Math.round(base[0] * (1 - alpha) + cor[0] * alpha),
    Math.round(base[1] * (1 - alpha) + cor[1] * alpha),
    Math.round(base[2] * (1 - alpha) + cor[2] * alpha),
  ];
}

/**
 * Desenha o trevo em resolução ampliada.
 * `padding` reserva a zona segura exigida pelos ícones maskable.
 */
function renderizar(tamanho, padding) {
  const escala = tamanho * SUPERSAMPLE;
  const pixels = Buffer.alloc(escala * escala * 4);

  const centro = escala / 2;
  const raioFolha = escala * (0.5 - padding) * 0.31;
  const deslocamento = raioFolha * 0.92;

  const folhas = [
    [centro - deslocamento, centro - deslocamento],
    [centro + deslocamento, centro - deslocamento],
    [centro - deslocamento, centro + deslocamento],
    [centro + deslocamento, centro + deslocamento],
  ];

  for (let y = 0; y < escala; y++) {
    for (let x = 0; x < escala; x++) {
      // Fundo em degradê diagonal, do roxo claro ao escuro.
      const progresso = (x + y) / (2 * escala);
      let cor = misturar(ROXO, ROXO_ESCURO, progresso);

      for (const [fx, fy] of folhas) {
        const dx = x - fx;
        const dy = y - fy;
        if (dx * dx + dy * dy <= raioFolha * raioFolha) {
          cor = BRANCO;
          break;
        }
      }

      // Caule: retângulo estreito descendo do centro até abaixo das folhas.
      const larguraCaule = raioFolha * 0.13;
      if (
        Math.abs(x - centro) <= larguraCaule &&
        y > centro + deslocamento * 0.2 &&
        y < centro + raioFolha * 2.55
      ) {
        cor = BRANCO;
      }

      const destino = (y * escala + x) * 4;
      pixels[destino] = cor[0];
      pixels[destino + 1] = cor[1];
      pixels[destino + 2] = cor[2];
      pixels[destino + 3] = 255;
    }
  }

  // Redução por média — é o que suaviza as bordas dos círculos.
  const final = Buffer.alloc(tamanho * tamanho * 4);
  const amostras = SUPERSAMPLE * SUPERSAMPLE;

  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      let r = 0;
      let g = 0;
      let b = 0;

      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const origem = ((y * SUPERSAMPLE + sy) * escala + (x * SUPERSAMPLE + sx)) * 4;
          r += pixels[origem];
          g += pixels[origem + 1];
          b += pixels[origem + 2];
        }
      }

      const destino = (y * tamanho + x) * 4;
      final[destino] = Math.round(r / amostras);
      final[destino + 1] = Math.round(g / amostras);
      final[destino + 2] = Math.round(b / amostras);
      final[destino + 3] = 255;
    }
  }

  return encodePng(tamanho, tamanho, final);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const arquivos = [
    { nome: 'icon-192.png', tamanho: 192, padding: 0.08 },
    { nome: 'icon-512.png', tamanho: 512, padding: 0.08 },
    // Maskable: o sistema pode recortar até 20% de cada borda.
    { nome: 'icon-maskable-512.png', tamanho: 512, padding: 0.2 },
  ];

  for (const { nome, tamanho, padding } of arquivos) {
    const png = renderizar(tamanho, padding);
    await writeFile(resolve(OUTPUT_DIR, nome), png);
    console.log(`[ok] ${nome} (${tamanho}x${tamanho}, ${(png.length / 1024).toFixed(1)} KB)`);
  }
}

await main();
