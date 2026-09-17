import {
  Bolao,
  BolaoConferencia,
  BolaoParticipant,
  BolaoRateio,
  GeneratedGame,
  LotteryDraw,
  LotteryType,
} from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';
import { checkTicketAgainstDraw } from '@/services/lotteryGameManager';

/**
 * Bolões: divisão de custo e de prêmio entre cotistas.
 *
 * O ponto sensível de um bolão não é gerar os jogos — é a prestação de contas.
 * Todo o rateio aqui é derivado do número de cotas, nunca digitado à mão, para
 * que ninguém precise confiar na aritmética de quem organizou.
 */

const BOLOES_KEY = 'caixa_lottery_boloes';

export function getBoloes(): Bolao[] {
  try {
    const raw = localStorage.getItem(BOLOES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(boloes: Bolao[]): void {
  try {
    localStorage.setItem(BOLOES_KEY, JSON.stringify(boloes));
  } catch {
    // Sem espaço em disco: o bolão segue apenas na sessão atual.
  }
}

export function saveBolao(bolao: Bolao): Bolao {
  const atuais = getBoloes();
  const idx = atuais.findIndex((b) => b.id === bolao.id);

  if (idx >= 0) atuais[idx] = bolao;
  else atuais.unshift(bolao);

  persist(atuais);
  return bolao;
}

export function removeBolao(bolaoId: string): void {
  persist(getBoloes().filter((b) => b.id !== bolaoId));
}

export function createBolao(params: {
  nome: string;
  lottery: LotteryType;
  games: GeneratedGame[];
  participantes: BolaoParticipant[];
  concursoAlvo?: number;
  taxaAdministracao?: number;
}): Bolao {
  const bolao: Bolao = {
    id: `bolao_${Date.now()}`,
    nome: params.nome.trim() || `Bolão ${LOTTERY_CONFIGS[params.lottery].name}`,
    lottery: params.lottery,
    concursoAlvo: params.concursoAlvo,
    createdAt: new Date().toISOString(),
    games: params.games,
    participantes: params.participantes,
    taxaAdministracao: params.taxaAdministracao ?? 0,
  };

  return saveBolao(bolao);
}

/** Custo total dos bilhetes que compõem o bolão. */
export function bolaoCost(bolao: Bolao): number {
  return Math.round(bolao.games.reduce((total, game) => total + game.cost, 0) * 100) / 100;
}

/**
 * Rateio do custo. O valor da cota sai do custo real dos bilhetes dividido
 * pelo total de cotas vendidas — quem comprou 2 cotas paga o dobro e, na
 * premiação, recebe o dobro.
 */
export function calcularRateio(bolao: Bolao): BolaoRateio {
  const custoTotal = bolaoCost(bolao);
  const totalCotas = bolao.participantes.reduce((soma, p) => soma + Math.max(0, p.cotas), 0);
  const valorPorCota = totalCotas > 0 ? custoTotal / totalCotas : 0;

  const participantes = bolao.participantes.map((participante) => ({
    participante,
    valorDevido: Math.round(participante.cotas * valorPorCota * 100) / 100,
    percentual: totalCotas > 0 ? Math.round((participante.cotas / totalCotas) * 1000) / 10 : 0,
  }));

  const arrecadado = participantes
    .filter((p) => p.participante.pago)
    .reduce((soma, p) => soma + p.valorDevido, 0);

  return {
    custoTotal,
    totalCotas,
    valorPorCota: Math.round(valorPorCota * 100) / 100,
    arrecadado: Math.round(arrecadado * 100) / 100,
    pendente: Math.round((custoTotal - arrecadado) * 100) / 100,
    participantes,
  };
}

/**
 * Confere todos os bilhetes do bolão contra o sorteio e distribui o prêmio
 * informado proporcionalmente às cotas, descontando a taxa de administração.
 *
 * O prêmio entra como parâmetro porque só a Caixa sabe o rateio final de cada
 * faixa — chutar esse valor seria prometer o que não se pode cumprir.
 */
export function conferirBolao(
  bolao: Bolao,
  draw: LotteryDraw,
  premioBruto: number,
): BolaoConferencia {
  const bilhetesPremiados = bolao.games
    .map((game) => {
      const resultado = checkTicketAgainstDraw(game.numbers, draw, game.extra);
      return {
        game,
        hits: resultado.hits,
        hitNumbers: resultado.hitNumbers,
        prizeLabel: resultado.prizeLabel,
        isWinner: resultado.isWinner,
      };
    })
    .filter((item) => item.isWinner)
    .map(({ isWinner: _isWinner, ...resto }) => resto)
    .sort((a, b) => b.hits - a.hits);

  const taxa = Math.min(Math.max(bolao.taxaAdministracao, 0), 100);
  const premioLiquido = Math.round(premioBruto * (1 - taxa / 100) * 100) / 100;

  const totalCotas = bolao.participantes.reduce((soma, p) => soma + Math.max(0, p.cotas), 0);

  const distribuicao = bolao.participantes.map((participante) => ({
    participante,
    cotas: participante.cotas,
    valorReceber:
      totalCotas > 0
        ? Math.round((premioLiquido * participante.cotas) / totalCotas * 100) / 100
        : 0,
  }));

  return {
    concurso: draw.concurso,
    premioBruto,
    taxaAdministracao: taxa,
    premioLiquido,
    bilhetesPremiados,
    distribuicao,
  };
}

/** Texto pronto para colar no grupo do WhatsApp, com a prestação de contas. */
export function formatBolaoForWhatsApp(bolao: Bolao): string {
  const config = LOTTERY_CONFIGS[bolao.lottery];
  const rateio = calcularRateio(bolao);
  const linhas: string[] = [];

  linhas.push(`🎟️ *BOLÃO ${bolao.nome.toUpperCase()}*`);
  linhas.push(`🍀 ${config.name}${bolao.concursoAlvo ? ` — concurso ${bolao.concursoAlvo}` : ''}`);
  linhas.push(`----------------------------------`);
  linhas.push(`📊 ${bolao.games.length} bilhetes | Custo total: R$ ${rateio.custoTotal.toFixed(2)}`);
  linhas.push(`👥 ${rateio.totalCotas} cotas | Valor da cota: R$ ${rateio.valorPorCota.toFixed(2)}`);
  linhas.push(`----------------------------------`);

  linhas.push(`*PARTICIPANTES*`);
  rateio.participantes.forEach(({ participante, valorDevido, percentual }) => {
    linhas.push(
      `${participante.pago ? '✅' : '⏳'} ${participante.nome} — ${participante.cotas} cota(s) | ` +
        `R$ ${valorDevido.toFixed(2)} | ${percentual}% do prêmio`,
    );
  });

  if (rateio.pendente > 0) {
    linhas.push(`\n⚠️ Falta receber: R$ ${rateio.pendente.toFixed(2)}`);
  }

  linhas.push(`----------------------------------`);
  linhas.push(`*JOGOS*`);
  bolao.games.forEach((game, idx) => {
    const dezenas = game.numbers.map((n) => String(n).padStart(2, '0')).join(' - ');
    linhas.push(`${idx + 1}. ${dezenas}`);
  });

  if (bolao.taxaAdministracao > 0) {
    linhas.push(`\n💼 Taxa de administração combinada: ${bolao.taxaAdministracao}%`);
  }

  linhas.push(`\n💡 *Jogue com responsabilidade (+18)*`);

  return linhas.join('\n');
}
