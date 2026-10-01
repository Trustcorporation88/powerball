import { GeneratedGame, LotteryExtraSelection, LotteryType } from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';
import { analyzeGame, computeGameScore } from '@/services/lotteryGenerator';

/**
 * Leitura de jogos feitos fora do site: texto do WhatsApp, planilha exportada,
 * arquivo TXT ou o texto que o OCR tirou da foto do bilhete.
 *
 * Cada linha costuma trazer um jogo, mas o recibo da Caixa quebra os 15
 * números da Lotofácil em duas linhas e o texto colado às vezes junta vários
 * jogos numa linha só. Por isso as dezenas são acumuladas até formar um jogo
 * e uma sequência longa é cortada onde a ordem crescente recomeça.
 */

export interface JogoLido {
  numbers: number[];
  extra?: LotteryExtraSelection;
  /** Trecho do texto de onde o jogo saiu, para o usuário conferir a leitura. */
  origem: string;
}

export interface LeituraDeJogos {
  jogos: JogoLido[];
  /** Linhas com dezenas que não fecharam um jogo válido. */
  ignorados: string[];
  /** Concurso escrito no texto ("Concurso 3793"), quando houver. */
  concursoDetectado?: number;
}

const RUIDO = [
  /R\$\s*[\d.,]+/gi,
  /\(\s*\d+\s*pts?\s*\)/gi,
  /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g,
  /\b\d{1,2}:\d{2}(:\d{2})?\b/g,
  /\bjogo\s*n?[ºo°.]?\s*\d+\b/gi,
  /\bconcurso\s*n?[ºo°.]?\s*:?\s*\d+\b/gi,
  /\b\d{1,2}\s*(cotas?|dezenas|n[úu]meros|apostas?|jogos|x)\b/gi,
];

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function dezenasDaLinha(linha: string, total: number): number[] {
  let limpa = linha;
  for (const padrao of RUIDO) limpa = limpa.replace(padrao, ' ');
  return (limpa.match(/\b\d{1,2}\b/g) ?? [])
    .map(Number)
    .filter((n) => n >= 1 && n <= total);
}

/** Corta uma sequência onde a ordem crescente recomeça (início de outro jogo). */
function cortarPorOrdem(dezenas: number[]): number[][] {
  const blocos: number[][] = [];
  let atual: number[] = [];
  for (const n of dezenas) {
    if (atual.length > 0 && n <= atual[atual.length - 1]) {
      blocos.push(atual);
      atual = [];
    }
    atual.push(n);
  }
  if (atual.length > 0) blocos.push(atual);
  return blocos;
}

export function lerJogosDoTexto(texto: string, lottery: LotteryType): LeituraDeJogos {
  const config = LOTTERY_CONFIGS[lottery];
  const { minSelection, maxSelection, totalNumbers, extraField } = config;
  const jogos: JogoLido[] = [];
  const ignorados: string[] = [];

  const concursoMatch = texto.match(/concurso\s*n?[ºo°.]?\s*:?\s*(\d{3,5})/i);
  const concursoDetectado = concursoMatch ? Number(concursoMatch[1]) : undefined;

  let pendente: number[] = [];
  let origemPendente: string[] = [];

  const fecharPendente = () => {
    if (pendente.length >= 3) ignorados.push(origemPendente.join(' / '));
    pendente = [];
    origemPendente = [];
  };

  const aceitar = (dezenas: number[], origem: string) => {
    jogos.push({ numbers: [...dezenas].sort((a, b) => a - b), origem });
  };

  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;
    const normalizada = semAcento(linha);

    if (extraField?.key === 'trevos' && normalizada.includes('trevo')) {
      const ultimo = jogos[jogos.length - 1];
      const trevos = [...new Set(dezenasDaLinha(linha.replace(/trevos?/gi, ' '), 6))];
      if (ultimo && trevos.length >= extraField.minSelection) {
        ultimo.extra = { trevos: trevos.slice(0, extraField.maxSelection).sort((a, b) => a - b) };
      }
      continue;
    }

    if (extraField?.key === 'mesSorte') {
      const mes = extraField.options.find((opcao) => normalizada.includes(semAcento(opcao)));
      if (mes) {
        const ultimo = jogos[jogos.length - 1];
        const dezenasNaLinha = dezenasDaLinha(linha, totalNumbers);
        if (dezenasNaLinha.length < minSelection) {
          if (ultimo) ultimo.extra = { mesSorte: mes };
          continue;
        }
      }
    }

    const dezenas = dezenasDaLinha(linha, totalNumbers);
    if (dezenas.length === 0) continue;

    // Uma linha que sozinha já forma um jogo não herda números soltos de cima
    // (loja, terminal, cabeçalho do recibo).
    if (dezenas.length >= minSelection) fecharPendente();

    pendente.push(...dezenas);
    origemPendente.push(linha);
    if (new Set(pendente).size < minSelection) continue;

    const origem = origemPendente.join(' / ');
    const valido = (bloco: number[]) =>
      bloco.length >= minSelection && bloco.length <= maxSelection;

    // Jogo digitado fora de ordem numa linha só.
    if (origemPendente.length === 1 && valido(pendente) && new Set(pendente).size === pendente.length) {
      aceitar(pendente, origem);
      pendente = [];
      origemPendente = [];
      continue;
    }

    const blocos = cortarPorOrdem(pendente);
    pendente = [];
    origemPendente = [];

    blocos.forEach((bloco, idx) => {
      const ultimo = idx === blocos.length - 1;
      if (valido(bloco)) {
        aceitar(bloco, origem);
      } else if (ultimo && bloco.length < minSelection) {
        // Começo de um jogo que continua na linha seguinte.
        pendente = [...bloco];
        origemPendente = [linha];
      } else if (bloco.length >= 3) {
        ignorados.push(bloco.map((n) => String(n).padStart(2, '0')).join(' '));
      }
    });
  }
  fecharPendente();

  return { jogos, ignorados, concursoDetectado };
}

/** Transforma os jogos lidos em bilhetes da Carteira, já apostados e com concurso. */
export function bilhetesImportados(
  jogos: JogoLido[],
  lottery: LotteryType,
  concursoAlvo: number,
): GeneratedGame[] {
  const config = LOTTERY_CONFIGS[lottery];
  const agora = new Date().toISOString();
  const lote = Date.now();

  return jogos.map((jogo, idx) => {
    const analysis = analyzeGame(lottery, jogo.numbers);
    const { score, label } = computeGameScore(analysis);
    return {
      id: `imp_${lote}_${idx}`,
      lottery,
      numbers: jogo.numbers,
      extra: jogo.extra,
      strategy: 'random',
      strategyLabel: 'Importado (jogo enviado por você)',
      createdAt: agora,
      cost: config.priceTable[jogo.numbers.length] ?? config.basePrice,
      score,
      scoreLabel: label,
      analysis,
      isBet: true,
      concursoAlvo,
    };
  });
}
