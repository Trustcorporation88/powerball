import { LotteryType } from '@/types/lottery';
import { API_URL } from '@/services/apiClient';

/** Espelha as respostas de `/lottery/status` e `/lottery/transparencia/:lottery`. */

export interface StatusModalidade {
  lottery: LotteryType;
  nome: string;
  ultimoConcurso: number | null;
  dataUltimoConcurso: string | null;
  dataProximoConcurso: string | null;
  ultimaSincronizacaoOk: string | null;
  fonteUltimaSincronizacao: string | null;
  ultimaTentativa: string | null;
  ultimoErro: string | null;
  fonteSemResposta: boolean;
  resultadoAtrasado: boolean;
  alerta: string | null;
}

export interface StatusDados {
  geradoEm: string;
  intervaloMinutos: number;
  modalidades: StatusModalidade[];
  falhasRecentes: Array<{ lottery: LotteryType; em: string; erro: string | null }>;
}

export interface PlacarEstrategia {
  strategy: string;
  strategyLabel: string;
  bilhetes: number;
  concursos: number;
  mediaAcertos: number;
  mediaEsperada: number;
  diferenca: number;
  melhorAcerto: number;
  distribuicao: Record<string, number>;
}

export interface RelatorioTransparencia {
  lottery: LotteryType;
  nome: string;
  geradoEm: string;
  bilhetesConferidos: number;
  bilhetesDescartados: number;
  bilhetesAguardando: number;
  usuarios: number;
  concursos: number;
  primeiroConcurso: number | null;
  ultimoConcurso: number | null;
  estrategias: PlacarEstrategia[];
}

async function getJson<T>(path: string): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const resposta = await fetch(`${API_URL}${path}`, { headers: { Accept: 'application/json' } });
    if (!resposta.ok) return null;
    return (await resposta.json()) as T;
  } catch {
    return null;
  }
}

export function buscarStatusDados(): Promise<StatusDados | null> {
  return getJson<StatusDados>('/lottery/status');
}

export function buscarTransparencia(lottery: LotteryType): Promise<RelatorioTransparencia | null> {
  return getJson<RelatorioTransparencia>(`/lottery/transparencia/${lottery}`);
}

const NOMES_FONTE: Record<string, string> = {
  proxy: 'API Powerball',
  caixa: 'Caixa',
  mirror: 'espelho público',
  cache: 'cópia salva neste aparelho',
  embedded: 'base histórica do site',
};

export function nomeDaFonte(fonte: string | null | undefined): string {
  return fonte ? (NOMES_FONTE[fonte] ?? fonte) : '—';
}

export function tempoDesde(iso: string | null | undefined, agora = Date.now()): string {
  if (!iso) return 'nunca';
  const minutos = Math.round((agora - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'agora há pouco';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 48) return `há ${horas} h`;
  return `há ${Math.round(horas / 24)} dias`;
}
