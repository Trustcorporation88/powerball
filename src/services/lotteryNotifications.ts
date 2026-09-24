import { LotteryType, UserSavedGame } from '@/types/lottery';
import { LOTTERY_CONFIGS, LOTTERY_ORDER } from '@/constants/lotteryConstants';
import { getLotteryHistory } from '@/services/lotteryApiService';

/**
 * Instalação do app e aviso de novo resultado.
 *
 * Não há servidor de push aqui: o aviso é disparado localmente quando o app é
 * aberto e detecta um concurso mais novo do que o último visto. Na prática é o
 * que o usuário quer — abrir o ícone na tela inicial e já saber que saiu
 * resultado — sem exigir infraestrutura de push nem assinatura de terceiros.
 */

const ULTIMO_VISTO_KEY = 'caixa_lottery_ultimo_visto';
const PREFERENCIA_KEY = 'caixa_lottery_avisos';

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Falha no registro não pode derrubar o app; ele só perde o modo offline.
    });
  });
}

export function notificacoesAtivadas(): boolean {
  try {
    return localStorage.getItem(PREFERENCIA_KEY) === 'on' && Notification.permission === 'granted';
  } catch {
    return false;
  }
}

export function notificacoesDisponiveis(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export async function ativarNotificacoes(): Promise<boolean> {
  if (!notificacoesDisponiveis()) return false;

  const permissao =
    Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();

  const ativo = permissao === 'granted';

  try {
    localStorage.setItem(PREFERENCIA_KEY, ativo ? 'on' : 'off');
  } catch {
    // Sem storage a preferência vale só nesta sessão.
  }

  return ativo;
}

export function desativarNotificacoes(): void {
  try {
    localStorage.setItem(PREFERENCIA_KEY, 'off');
  } catch {
    // ignora
  }
}

function lerUltimosVistos(): Record<string, number> {
  try {
    const raw = localStorage.getItem(ULTIMO_VISTO_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function gravarUltimosVistos(valores: Record<string, number>): void {
  try {
    localStorage.setItem(ULTIMO_VISTO_KEY, JSON.stringify(valores));
  } catch {
    // ignora
  }
}

async function notificar(titulo: string, corpo: string, url: string, tag: string): Promise<void> {
  const registro = await navigator.serviceWorker.ready;

  if (registro.active) {
    registro.active.postMessage({ type: 'NOVO_RESULTADO', titulo, corpo, url, tag });
    return;
  }

  await registro.showNotification(titulo, { body: corpo, tag, data: { url } });
}

function formatarReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Frase curta com o resultado de um bilhete já conferido. */
export function descreverConferencia(game: UserSavedGame): string {
  const resultado = game.checkResult;
  if (!resultado) return '';
  const nome = LOTTERY_CONFIGS[game.lottery].name;
  const base = `${nome} ${resultado.drawNumber}: ${resultado.hits} acertos`;
  if (!resultado.isWinner) return base;
  return resultado.valorPremio
    ? `${base} — premiado, ${formatarReais(resultado.valorPremio)}`
    : `${base} — premiado!`;
}

/**
 * Avisa sobre bilhetes que acabaram de ser conferidos: uma notificação por
 * bilhete premiado e, se nenhum ganhou, um resumo com o melhor resultado.
 */
export async function notificarConferencia(conferidos: UserSavedGame[]): Promise<void> {
  if (conferidos.length === 0 || !notificacoesAtivadas()) return;

  const premiados = conferidos.filter((game) => game.checkResult?.isWinner);

  try {
    if (premiados.length > 0) {
      for (const game of premiados.slice(0, 5)) {
        const resultado = game.checkResult!;
        await notificar(
          `Seu bilhete fez ${resultado.hits} pontos!`,
          `${descreverConferencia(game)}. Confira na Carteira e no site da Caixa.`,
          '/',
          `premio-${game.id}`,
        );
      }
      return;
    }

    const melhor = conferidos.reduce((a, b) =>
      (b.checkResult?.hits ?? 0) > (a.checkResult?.hits ?? 0) ? b : a,
    );
    await notificar(
      `${conferidos.length} bilhete(s) conferido(s)`,
      `Nenhum premiado desta vez. Melhor resultado — ${descreverConferencia(melhor)}.`,
      '/',
      `conferencia-${melhor.checkResult?.drawNumber ?? ''}`,
    );
  } catch {
    // Sem service worker pronto o aviso fica só na tela.
  }
}

/**
 * Compara o concurso mais recente de cada modalidade com o último que o
 * usuário viu e avisa sobre o que saiu desde então.
 *
 * Na primeira execução apenas registra o estado atual: ninguém quer receber
 * seis notificações de resultados antigos por ter instalado o app.
 */
export async function verificarNovosResultados(
  modalidades: LotteryType[] = LOTTERY_ORDER,
): Promise<void> {
  if (!notificacoesAtivadas()) return;

  const vistos = lerUltimosVistos();
  const primeiraExecucao = Object.keys(vistos).length === 0;
  const atualizados = { ...vistos };

  for (const lottery of modalidades) {
    try {
      const historico = await getLotteryHistory(lottery, { skipNetwork: primeiraExecucao });
      const maisRecente = historico.draws[0];
      if (!maisRecente) continue;

      const anterior = vistos[lottery] ?? 0;
      atualizados[lottery] = maisRecente.concurso;

      if (primeiraExecucao || maisRecente.concurso <= anterior) continue;

      const config = LOTTERY_CONFIGS[lottery];
      const dezenas = maisRecente.dezenas.map((n) => String(n).padStart(2, '0')).join(' - ');

      await notificar(
        `${config.name} ${maisRecente.concurso} — resultado saiu`,
        `${dezenas}${maisRecente.acumulou ? ' • Acumulou!' : ''}`,
        `/resultado/${config.slug}/${maisRecente.concurso}`,
        `resultado-${lottery}`,
      );
    } catch {
      // Uma modalidade indisponível não pode impedir a checagem das outras.
    }
  }

  gravarUltimosVistos(atualizados);
}
