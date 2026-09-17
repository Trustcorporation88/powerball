import { UserSavedGame } from '@/types/lottery';
import { API_URL, getToken, isRemote } from '@/services/apiClient';
import { getSavedGames, replaceSavedGames } from '@/services/lotteryGameManager';

/**
 * Sincronização da carteira com a nuvem.
 *
 * O armazenamento local continua sendo a fonte primária: quem não faz login
 * segue usando o site inteiro sem conta. Com login e `VITE_API_URL`
 * configurado, a carteira passa a acompanhar o usuário entre celular e
 * computador.
 */

export type SyncStatus = 'desativado' | 'sem-login' | 'sincronizado' | 'erro';

export interface SyncResult {
  status: SyncStatus;
  games?: UserSavedGame[];
  mensagem?: string;
}

export function isCloudSyncAvailable(): boolean {
  return isRemote() && getToken().length > 0;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const corpo = await response.json().catch(() => ({}));
    throw new Error((corpo as { message?: string }).message ?? `Falha na sincronização (${response.status})`);
  }

  return (await response.json()) as T;
}

/**
 * Une carteira local e remota e devolve a versão consolidada.
 *
 * Em conflito de mesmo id vence o registro mais recente, medido por
 * `createdAt` e pela presença de conferência — assim marcar um bilhete como
 * apostado no celular não é desfeito por uma aba antiga aberta no desktop.
 */
function merge(local: UserSavedGame[], remoto: UserSavedGame[]): UserSavedGame[] {
  const porId = new Map<string, UserSavedGame>();

  for (const game of [...remoto, ...local]) {
    const existente = porId.get(game.id);
    if (!existente) {
      porId.set(game.id, game);
      continue;
    }

    const maisRico =
      (game.checkResult ? 1 : 0) + (game.isBet ? 1 : 0) >=
      (existente.checkResult ? 1 : 0) + (existente.isBet ? 1 : 0);

    porId.set(game.id, maisRico ? { ...existente, ...game } : existente);
  }

  return Array.from(porId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Baixa a carteira remota, funde com a local e sobe o resultado. */
export async function syncWallet(): Promise<SyncResult> {
  if (!isRemote()) return { status: 'desativado' };
  if (!getToken()) return { status: 'sem-login' };

  try {
    const remoto = await request<{ games: UserSavedGame[] }>('/lottery/wallet');
    const consolidado = merge(getSavedGames(), remoto.games ?? []);

    await request('/lottery/wallet', {
      method: 'PUT',
      body: JSON.stringify({ games: consolidado }),
    });

    replaceSavedGames(consolidado);

    return { status: 'sincronizado', games: consolidado };
  } catch (error) {
    return {
      status: 'erro',
      mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/** Envia a carteira local sem baixar antes. Usado após alterações pontuais. */
export async function pushWallet(games: UserSavedGame[]): Promise<void> {
  if (!isCloudSyncAvailable()) return;

  try {
    await request('/lottery/wallet', {
      method: 'PUT',
      body: JSON.stringify({ games }),
    });
  } catch {
    // Falha de rede não pode travar a carteira local; o próximo sync resolve.
  }
}
