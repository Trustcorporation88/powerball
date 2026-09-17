import { LotteryType, ResponsibleGamingSettings, SpendingSummary, UserSavedGame } from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';

/**
 * Jogo responsável.
 *
 * Nenhuma estatística deste site altera a probabilidade de um sorteio: cada
 * concurso é independente e as chances abaixo são fixas. O que dá para
 * controlar de verdade é quanto se gasta — e é isso que este módulo faz.
 */

const SETTINGS_KEY = 'caixa_lottery_responsible';

const DEFAULT_SETTINGS: ResponsibleGamingSettings = {
  limiteMensal: 0,
  alertarEm: 80,
  mostrarProbabilidades: true,
  atualizadoEm: new Date().toISOString(),
};

export function getResponsibleSettings(): ResponsibleGamingSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveResponsibleSettings(
  settings: Partial<ResponsibleGamingSettings>,
): ResponsibleGamingSettings {
  const atualizado: ResponsibleGamingSettings = {
    ...getResponsibleSettings(),
    ...settings,
    atualizadoEm: new Date().toISOString(),
  };

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(atualizado));
  } catch {
    // Sem storage: a configuração vale só para esta sessão.
  }

  return atualizado;
}

function mesReferencia(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Soma o que foi efetivamente apostado no mês corrente.
 * Só contam os jogos marcados como apostados: gerar palpite não custa nada.
 */
export function calcularGastoMensal(
  games: UserSavedGame[],
  referencia: Date = new Date(),
): SpendingSummary {
  const settings = getResponsibleSettings();
  const mes = mesReferencia(referencia);

  const doMes = games.filter((game) => {
    if (!game.isBet) return false;
    const criado = new Date(game.createdAt);
    return Number.isFinite(criado.getTime()) && mesReferencia(criado) === mes;
  });

  const totalApostado = Math.round(doMes.reduce((soma, g) => soma + g.cost, 0) * 100) / 100;
  const limite = settings.limiteMensal;
  const percentualUsado = limite > 0 ? Math.round((totalApostado / limite) * 1000) / 10 : 0;

  return {
    mesReferencia: mes,
    totalApostado,
    limiteMensal: limite,
    percentualUsado,
    restante: limite > 0 ? Math.round((limite - totalApostado) * 100) / 100 : 0,
    excedido: limite > 0 && totalApostado > limite,
    emAlerta: limite > 0 && percentualUsado >= settings.alertarEm,
  jogosApostados: doMes.length,
  };
}

/**
 * Avalia se uma nova aposta cabe no limite antes de ela ser registrada.
 */
export function avaliarNovaAposta(
  games: UserSavedGame[],
  custoAdicional: number,
): { permitido: boolean; mensagem?: string; resumo: SpendingSummary } {
  const resumo = calcularGastoMensal(games);

  if (resumo.limiteMensal <= 0) {
    return { permitido: true, resumo };
  }

  const projetado = resumo.totalApostado + custoAdicional;

  if (projetado > resumo.limiteMensal) {
    return {
      permitido: false,
      mensagem:
        `Esta aposta de R$ ${custoAdicional.toFixed(2)} levaria seu gasto do mês a ` +
        `R$ ${projetado.toFixed(2)}, acima do limite de R$ ${resumo.limiteMensal.toFixed(2)} que você definiu.`,
      resumo,
    };
  }

  const percentualProjetado = (projetado / resumo.limiteMensal) * 100;
  if (percentualProjetado >= getResponsibleSettings().alertarEm) {
    return {
      permitido: true,
      mensagem:
        `Com esta aposta você chega a ${percentualProjetado.toFixed(0)}% do seu limite mensal ` +
        `(R$ ${projetado.toFixed(2)} de R$ ${resumo.limiteMensal.toFixed(2)}).`,
      resumo,
    };
  }

  return { permitido: true, resumo };
}

/** Formata a chance da faixa principal como "1 em 50.063.860". */
export function formatarChance(lottery: LotteryType): string {
  const odds = LOTTERY_CONFIGS[lottery].mainPrizeOdds;
  return `1 em ${odds.toLocaleString('pt-BR')}`;
}

/**
 * Traduz a probabilidade para uma comparação que se consegue imaginar.
 * Números como "1 em 50 milhões" não significam nada sozinhos.
 */
export function compararChance(lottery: LotteryType, apostas = 1): string {
  const config = LOTTERY_CONFIGS[lottery];
  const odds = Math.round(config.mainPrizeOdds / Math.max(1, apostas));

  // Concursos necessários, em média, para acertar a faixa principal uma vez.
  const sorteiosPorSemana = config.drawDays.length;
  const anos = odds / (sorteiosPorSemana * 52);

  if (anos >= 1000) {
    return `Apostando ${apostas} jogo(s) em todos os concursos, a faixa principal sairia em média uma vez a cada ${Math.round(anos).toLocaleString('pt-BR')} anos.`;
  }

  return `Apostando ${apostas} jogo(s) em todos os concursos, a faixa principal sairia em média uma vez a cada ${Math.round(anos).toLocaleString('pt-BR')} anos de apostas ininterruptas.`;
}

/** Quanto custaria manter um ritmo de apostas por um ano. */
export function custoAnualProjetado(lottery: LotteryType, custoPorConcurso: number): number {
  const sorteiosPorAno = LOTTERY_CONFIGS[lottery].drawDays.length * 52;
  return Math.round(custoPorConcurso * sorteiosPorAno * 100) / 100;
}
