import { LotteryType, NivelPopularidade, Popularidade } from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';

/**
 * Índice de popularidade de uma combinação (0 = rara, 100 = muito marcada).
 *
 * Não muda a chance de acertar: todo jogo tem a mesma probabilidade. Muda
 * quantas pessoas dividem o prêmio se ele sair. Os padrões abaixo são os que
 * os estudos com apostas reais apontam como super-representados (Henze &
 * Riedwyl, loteria alemã; Cook & Clotfelter e dados da UK National Lottery):
 * datas de aniversário, sequências e progressões, desenhos no volante,
 * múltiplos de um mesmo número, mesmo final e cópia do último resultado.
 */

function maiorProgressao(ordenados: number[]): number {
  let melhor = ordenados.length > 0 ? 1 : 0;
  const conjunto = new Set(ordenados);
  for (let i = 0; i < ordenados.length; i++) {
    for (let j = i + 1; j < ordenados.length; j++) {
      const passo = ordenados[j] - ordenados[i];
      let tamanho = 2;
      let proximo = ordenados[j] + passo;
      while (conjunto.has(proximo)) {
        tamanho++;
        proximo += passo;
      }
      if (tamanho > melhor) melhor = tamanho;
    }
  }
  return melhor;
}

function maiorGrupo(chaves: number[]): number {
  const contagem = new Map<number, number>();
  for (const chave of chaves) contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  return Math.max(0, ...contagem.values());
}

export function popularidadeDoJogo(
  lottery: LotteryType,
  numbers: number[],
  ultimoSorteio?: number[],
): Popularidade {
  const config = LOTTERY_CONFIGS[lottery];
  const n = numbers.length;
  const ordenados = [...numbers].sort((a, b) => a - b);
  const colunas = config.colsGrid;
  const motivos: string[] = [];
  let pontos = 0;

  // Os limites abaixo foram calibrados para que menos de ~10% dos jogos
  // sorteados ao acaso caiam fora de "baixa": só conta o que é raro no acaso.
  if (config.totalNumbers > 31) {
    const datas = ordenados.filter((x) => x <= 31).length;
    if (datas === n) {
      pontos += 40;
      motivos.push('Todas as dezenas são possíveis datas (1 a 31)');
    } else if (n >= 5 && datas === n - 1) {
      pontos += 10;
      motivos.push(`${datas} de ${n} dezenas são possíveis datas (1 a 31)`);
    }
  }
  const meses = ordenados.filter((x) => x <= 12).length;
  const esperadoMeses = (n * 12) / config.totalNumbers;
  if (meses >= esperadoMeses + 2.5) {
    pontos += Math.round(6 * (meses - esperadoMeses));
    motivos.push(`${meses} dezenas entre 1 e 12 (dias e meses)`);
  }

  const progressao = maiorProgressao(ordenados);
  const densidade = n / config.totalNumbers;
  const limiteProgressao = densidade >= 0.5 ? 9 : densidade >= 0.2 ? 5 : 4;
  if (progressao >= limiteProgressao) {
    pontos += 15 * (progressao - limiteProgressao + 1);
    motivos.push(`Sequência ou progressão de ${progressao} dezenas`);
  }

  const linha = maiorGrupo(ordenados.map((x) => Math.floor((x - 1) / colunas)));
  const coluna = maiorGrupo(ordenados.map((x) => (x - 1) % colunas));
  const limiteVolante = Math.max(4, Math.ceil(n * 0.6));
  if (config.totalNumbers > 31 && Math.max(linha, coluna) >= limiteVolante) {
    pontos += 15;
    motivos.push('Desenho em linha ou coluna do volante');
  }

  if (config.totalNumbers > 31) {
    const finais = maiorGrupo(ordenados.map((x) => x % 10));
    if (finais >= Math.max(3, Math.ceil(n / 2) + 1)) {
      pontos += 10;
      motivos.push(`${finais} dezenas com o mesmo final`);
    }
  }

  for (const base of [5, 7, 10]) {
    if (n > 2 && ordenados.every((x) => x % base === 0)) {
      pontos += 20;
      motivos.push(`Todas múltiplas de ${base}`);
      break;
    }
  }

  if (ultimoSorteio?.length) {
    const repetidas = ordenados.filter((x) => ultimoSorteio.includes(x)).length;
    const esperado = (n * ultimoSorteio.length) / config.totalNumbers;
    if (repetidas >= Math.max(3, Math.ceil(esperado + 2))) {
      pontos += 8 * (repetidas - Math.ceil(esperado));
      motivos.push(`${repetidas} dezenas repetidas do último resultado`);
    }
  }

  const indice = Math.max(0, Math.min(100, pontos));
  const nivel: NivelPopularidade = indice >= 35 ? 'alta' : indice >= 15 ? 'media' : 'baixa';
  return { indice, nivel, motivos };
}

export const ROTULO_POPULARIDADE: Record<NivelPopularidade, string> = {
  baixa: 'Pouco marcado',
  media: 'Marcação comum',
  alta: 'Muito marcado',
};

/**
 * Sugere o grupo de dezenas de um fechamento cujos bilhetes ficam menos
 * populares. Sorteia grupos uniformemente (nenhuma dezena tem mais chance que
 * outra) e fica com o de menor popularidade somada nos bilhetes. Devolve as
 * fixas primeiro, na mesma convenção de `ordenarContraDivisao`.
 */
export function sugerirGrupoPoucoMarcado(
  lottery: LotteryType,
  tamanho: number,
  matrizes: number[][],
  fixas = 0,
  ultimoSorteio?: number[],
  candidatos = 120,
): { fixas: number[]; dezenas: number[] } {
  const total = LOTTERY_CONFIGS[lottery].totalNumbers;
  const todas = Array.from({ length: total }, (_, i) => i + 1);
  const custo = (ordem: number[]) =>
    matrizes.reduce(
      (soma, bilhete) =>
        soma + popularidadeDoJogo(lottery, bilhete.map((i) => ordem[i]), ultimoSorteio).indice,
      0,
    );

  let melhor: number[] = [];
  let melhorCusto = Infinity;
  for (let c = 0; c < candidatos && melhorCusto > 0; c++) {
    const embaralhadas = [...todas];
    for (let i = embaralhadas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [embaralhadas[i], embaralhadas[j]] = [embaralhadas[j], embaralhadas[i]];
    }
    const grupo = embaralhadas.slice(0, tamanho);
    const ordem = ordenarContraDivisao(lottery, grupo, matrizes, fixas, ultimoSorteio, 15);
    const valor = custo(ordem);
    if (valor < melhorCusto) {
      melhor = ordem;
      melhorCusto = valor;
    }
  }
  return {
    fixas: melhor.slice(0, fixas).sort((a, b) => a - b),
    dezenas: [...melhor].sort((a, b) => a - b),
  };
}

/**
 * Reetiqueta as dezenas de um fechamento para que os bilhetes fiquem menos
 * populares. Trocar dezenas de posição na matriz não altera a garantia, porque
 * uma cobertura continua sendo cobertura sob qualquer renomeação dos pontos.
 * As `fixas` primeiras posições ficam paradas (entram em todos os bilhetes).
 */
export function ordenarContraDivisao(
  lottery: LotteryType,
  dezenas: number[],
  matrizes: number[][],
  fixas = 0,
  ultimoSorteio?: number[],
  tentativas = 300,
): number[] {
  const custo = (ordem: number[]) =>
    matrizes.reduce((soma, bilhete) => {
      const jogo = bilhete.map((i) => ordem[i]);
      return soma + popularidadeDoJogo(lottery, jogo, ultimoSorteio).indice;
    }, 0);

  let melhor = [...dezenas];
  let melhorCusto = custo(melhor);
  for (let t = 0; t < tentativas && melhorCusto > 0; t++) {
    const ordem = [...dezenas];
    for (let i = ordem.length - 1; i > fixas; i--) {
      const j = fixas + Math.floor(Math.random() * (i - fixas + 1));
      [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
    }
    const valor = custo(ordem);
    if (valor < melhorCusto) {
      melhor = ordem;
      melhorCusto = valor;
    }
  }
  return melhor;
}
