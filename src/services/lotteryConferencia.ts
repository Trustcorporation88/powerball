import { LotteryDraw, LotteryType, UserSavedGame } from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';
import { getDrawByConcurso } from '@/services/lotteryApiService';
import { checkTicketAgainstDraw, FaixaAtingida } from '@/services/lotteryGameManager';

/**
 * Conferência da Carteira pelo concurso de cada bilhete.
 *
 * Antes cada bilhete era comparado com "o último sorteio carregado": um jogo
 * de sábado aberto na quarta era conferido contra o concurso errado, e jogos
 * de outra modalidade nem eram conferidos. Agora cada bilhete carrega o
 * concurso para o qual foi feito e só é conferido contra ele.
 */

/**
 * Calendário da Caixa (Brasília = UTC−3):
 * - de segunda a sábado o sorteio é às 21h e as apostas fecham às 20h;
 * - desde 19/07/2026 o sorteio de fim de semana é no domingo às 11h, com
 *   apostas até as 22h de sábado.
 * Quando um feriado ou eleição antecipa o domingo para sábado, a data do
 * concurso já vem como sábado e cai na regra dos dias de semana.
 */
function dataDoConcurso(data: string | undefined): { ano: number; mes: number; dia: number; domingo: boolean } | null {
  const partes = String(data ?? '').split('/');
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes.map(Number);
  if (!dia || !mes || !ano) return null;
  const domingo = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay() === 0;
  return { ano, mes, dia, domingo };
}

/** Hora em que a Caixa sorteia o concurso (usada para saber se o resultado já deveria ter saído). */
export function momentoDoSorteio(data: string | undefined): number | null {
  const d = dataDoConcurso(data);
  if (!d) return null;
  return d.domingo
    ? Date.UTC(d.ano, d.mes - 1, d.dia, 14, 0, 0)
    : Date.UTC(d.ano, d.mes - 1, d.dia + 1, 0, 0, 0);
}

/** Último instante em que uma aposta ainda vale para o concurso. */
export function fechamentoDasApostas(data: string | undefined): number | null {
  const d = dataDoConcurso(data);
  if (!d) return null;
  return d.domingo
    ? Date.UTC(d.ano, d.mes - 1, d.dia, 1, 0, 0)
    : Date.UTC(d.ano, d.mes - 1, d.dia, 23, 0, 0);
}

/**
 * Próximo concurso ainda aberto para apostas.
 *
 * Se a data do próximo sorteio já passou, o resultado dele só não chegou
 * ainda; apostar agora vale para o seguinte.
 */
export function proximoConcursoAberto(draws: LotteryDraw[], agora = Date.now()): number | null {
  const ultimo = draws[0];
  if (!ultimo) return null;

  const proximo = momentoDoSorteio(ultimo.dataProximoConcurso);
  return proximo !== null && proximo <= agora ? ultimo.concurso + 2 : ultimo.concurso + 1;
}

/**
 * Concurso de um bilhete antigo, gravado antes de existir o campo: o
 * primeiro sorteio realizado depois do momento em que ele foi criado.
 */
export function inferirConcursoAlvo(criadoEm: string, draws: LotteryDraw[]): number | null {
  const criado = new Date(criadoEm).getTime();
  if (!Number.isFinite(criado) || draws.length === 0) return null;

  let alvo: number | null = null;
  for (const draw of draws) {
    const momento = momentoDoSorteio(draw.data);
    if (momento === null) continue;
    if (momento <= criado) break;
    alvo = draw.concurso;
  }

  return alvo ?? proximoConcursoAberto(draws, criado);
}

/**
 * Sobe quando a regra de premiação muda, para a Carteira reconferir bilhetes
 * já conferidos. 2: Mês da Sorte do Dia de Sorte como faixa própria.
 * 3: apostas múltiplas premiadas por aposta simples, Dupla Sena nos dois
 * sorteios e faixas oficiais da +Milionária.
 */
const VERSAO_DA_REGRA = 3;

/**
 * Prêmio bruto do bilhete: soma, faixa a faixa, das apostas simples premiadas
 * vezes o valor que a Caixa publicou. Fica indefinido enquanto alguma faixa
 * atingida não tiver valor publicado (rateio ainda não saiu).
 */
export function valorDoResultado(
  lottery: LotteryType,
  draw: LotteryDraw,
  faixas: FaixaAtingida[] | undefined,
): number | undefined {
  const config = LOTTERY_CONFIGS[lottery];
  if (!faixas?.length || !draw.premiacoes?.length) return undefined;

  const ehFaixaDoMes = (descricao: string) => /m[eê]s/i.test(descricao);
  const ordenadas = [...draw.premiacoes].sort((a, b) => a.faixa - b.faixa);
  const dezenas = ordenadas.filter((faixa) => !ehFaixaDoMes(faixa.descricao));
  const faixaDoMes = ordenadas.find((faixa) => ehFaixaDoMes(faixa.descricao));
  // Na Dupla Sena a Caixa publica as faixas do 1º sorteio e depois as do 2º.
  const porSorteio = config.prizeTiers.length;
  if (dezenas.length !== porSorteio * (config.hasSecondDraw ? 2 : 1)) return undefined;

  let total = 0;
  for (const faixa of faixas) {
    const publicada = faixa.mesSorte
      ? faixaDoMes
      : faixa.tier !== undefined
        ? dezenas[faixa.tier + (faixa.sorteio === 2 ? porSorteio : 0)]
        : undefined;
    if (!publicada?.valorPremio || publicada.valorPremio <= 0) return undefined;
    total += publicada.valorPremio * faixa.quantidade;
  }
  return Math.round(total * 100) / 100;
}

export type SituacaoBilhete =
  | { tipo: 'sem-concurso' }
  | { tipo: 'aguardando'; concurso: number }
  | { tipo: 'conferido'; concurso: number };

export function situacaoDoBilhete(game: UserSavedGame): SituacaoBilhete {
  if (!game.concursoAlvo) return { tipo: 'sem-concurso' };
  if (game.checkResult && game.checkResult.drawNumber === game.concursoAlvo) {
    return { tipo: 'conferido', concurso: game.concursoAlvo };
  }
  return { tipo: 'aguardando', concurso: game.concursoAlvo };
}

export interface ResultadoConferencia {
  carteira: UserSavedGame[];
  /** Bilhetes que ganharam conferência nesta rodada. */
  recemConferidos: UserSavedGame[];
  alterou: boolean;
}

/**
 * Completa o concurso-alvo que faltar e confere os bilhetes cujo sorteio já
 * aconteceu. `historicos` traz os concursos conhecidos de cada modalidade,
 * do mais novo para o mais antigo.
 */
export async function conferirCarteira(
  games: UserSavedGame[],
  historicos: Partial<Record<LotteryType, LotteryDraw[]>>,
): Promise<ResultadoConferencia> {
  const recemConferidos: UserSavedGame[] = [];
  const buscados = new Map<string, LotteryDraw | null>();
  let alterou = false;

  const carteira: UserSavedGame[] = [];

  for (const original of games) {
    let game = original;
    const draws = historicos[game.lottery] ?? [];

    if (!game.concursoAlvo) {
      const inferido = inferirConcursoAlvo(game.createdAt, draws);
      if (inferido) {
        game = { ...game, concursoAlvo: inferido };
        alterou = true;
      }
    }

    const alvo = game.concursoAlvo;
    const ultimoConhecido = draws[0]?.concurso ?? 0;
    const anterior = game.checkResult;
    const jaConferido =
      anterior?.drawNumber === alvo && (anterior.regra ?? 1) >= VERSAO_DA_REGRA;

    if (!alvo || jaConferido || alvo > ultimoConhecido) {
      carteira.push(game);
      continue;
    }

    const chave = `${game.lottery}:${alvo}`;
    let draw = draws.find((item) => item.concurso === alvo) ?? buscados.get(chave);
    if (draw === undefined) {
      draw = await getDrawByConcurso(game.lottery, alvo);
      buscados.set(chave, draw);
    }

    if (!draw) {
      carteira.push(game);
      continue;
    }

    const resultado = checkTicketAgainstDraw(game.numbers, draw, game.extra);
    game = {
      ...game,
      checkResult: {
        drawNumber: alvo,
        hits: resultado.hits,
        hitNumbers: resultado.hitNumbers,
        isWinner: resultado.isWinner,
        prizeLabel: resultado.prizeLabel,
        secondDrawHits: resultado.secondDrawHits,
        extraHit: resultado.extraHit,
        faixas: resultado.faixas,
        valorPremio: valorDoResultado(game.lottery, draw, resultado.faixas),
        drawDate: draw.data,
        conferidoEm: new Date().toISOString(),
        regra: VERSAO_DA_REGRA,
      },
    };

    alterou = true;
    // Reconferir pela regra nova só avisa de novo quando o resultado mudou.
    const mudou =
      anterior?.drawNumber !== alvo ||
      anterior.isWinner !== resultado.isWinner ||
      anterior.prizeLabel !== resultado.prizeLabel;
    if (mudou) recemConferidos.push(game);
    carteira.push(game);
  }

  return { carteira, recemConferidos, alterou };
}

/** Modalidades da carteira com bilhete esperando conferência ou sem concurso. */
export function modalidadesPendentes(games: UserSavedGame[]): LotteryType[] {
  const pendentes = new Set<LotteryType>();
  for (const game of games) {
    if (situacaoDoBilhete(game).tipo !== 'conferido') pendentes.add(game.lottery);
  }
  return Array.from(pendentes);
}
