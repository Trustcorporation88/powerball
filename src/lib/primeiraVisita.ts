const VISITA_KEY = 'caixa_lottery_visitou';

/**
 * Na primeira visita o guia "Como Usar" abre sozinho; depois disso o usuário
 * cai direto no gerador, que é o que ele veio fazer.
 */
export function ehPrimeiraVisita(): boolean {
  try {
    return localStorage.getItem(VISITA_KEY) !== 'sim';
  } catch {
    // Sem storage não dá para saber, e reabrir o guia todo dia incomoda mais
    // do que não mostrar.
    return false;
  }
}

export function marcarVisita(): void {
  try {
    localStorage.setItem(VISITA_KEY, 'sim');
  } catch {
    // O guia reabre na próxima visita, o que é inofensivo.
  }
}
