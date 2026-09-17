import { apiFetch, getToken, isRemote } from '@/services/apiClient';
import { TERMOS_VERSAO } from '@/constants/termosDeUso';

/**
 * Aceite do termo de uso, por usuário.
 *
 * O registro que vale é o do servidor, porque é o único que o usuário não
 * consegue alterar. Mas derrubar o acesso de quem já aceitou só porque a API
 * ficou fora do ar seria pior do que o problema: então o aceite também fica
 * gravado no navegador e é reenviado ao servidor na primeira oportunidade.
 */

export interface AceiteRegistro {
  version: string;
  acceptedAt: string;
  /** Falso enquanto o registro existir apenas neste navegador. */
  sincronizado: boolean;
}

const ACEITES_KEY = 'caixa_lottery_aceites';

type MapaLocal = Record<string, AceiteRegistro[]>;

function chaveUsuario(email: string): string {
  return email.trim().toLowerCase();
}

function lerLocal(): MapaLocal {
  try {
    const bruto = localStorage.getItem(ACEITES_KEY);
    return bruto ? (JSON.parse(bruto) as MapaLocal) : {};
  } catch {
    return {};
  }
}

function gravarLocal(mapa: MapaLocal): void {
  try {
    localStorage.setItem(ACEITES_KEY, JSON.stringify(mapa));
  } catch {
    // Sem storage o aceite vale só nesta sessão; o servidor continua sendo a
    // fonte da verdade quando estiver disponível.
  }
}

function registrosLocais(email: string): AceiteRegistro[] {
  return lerLocal()[chaveUsuario(email)] ?? [];
}

function salvarLocal(email: string, registro: AceiteRegistro): void {
  const mapa = lerLocal();
  const chave = chaveUsuario(email);
  const atuais = (mapa[chave] ?? []).filter((item) => item.version !== registro.version);
  mapa[chave] = [...atuais, registro];
  gravarLocal(mapa);
}

function podeUsarApi(): boolean {
  return isRemote() && getToken().length > 0;
}

async function buscarNoServidor(): Promise<AceiteRegistro[] | null> {
  try {
    const dados = await apiFetch<{ acceptances: Array<{ version: string; acceptedAt: string }> }>(
      '/terms/acceptances',
    );
    return dados.acceptances.map((item) => ({ ...item, sincronizado: true }));
  } catch {
    return null;
  }
}

async function enviarAoServidor(version: string): Promise<AceiteRegistro | null> {
  try {
    const dados = await apiFetch<{ version: string; acceptedAt: string }>('/terms/accept', {
      method: 'POST',
      body: { version },
    });
    return { ...dados, sincronizado: true };
  } catch {
    return null;
  }
}

/**
 * Descobre se o usuário já aceitou a versão vigente do termo.
 *
 * Aproveita a consulta para empurrar ao servidor qualquer aceite que tenha
 * ficado preso no navegador por indisponibilidade da API.
 */
export async function verificarAceiteVigente(email: string): Promise<AceiteRegistro | null> {
  const locais = registrosLocais(email);

  if (podeUsarApi()) {
    const remotos = await buscarNoServidor();

    if (remotos) {
      for (const registro of remotos) {
        salvarLocal(email, registro);
      }

      const pendentes = locais.filter(
        (local) => !local.sincronizado && !remotos.some((r) => r.version === local.version),
      );

      for (const pendente of pendentes) {
        const enviado = await enviarAoServidor(pendente.version);
        if (enviado) {
          salvarLocal(email, enviado);
          remotos.push(enviado);
        }
      }

      return remotos.find((registro) => registro.version === TERMOS_VERSAO) ?? null;
    }
  }

  return locais.find((registro) => registro.version === TERMOS_VERSAO) ?? null;
}

export async function registrarAceite(email: string): Promise<AceiteRegistro> {
  if (podeUsarApi()) {
    const remoto = await enviarAoServidor(TERMOS_VERSAO);
    if (remoto) {
      salvarLocal(email, remoto);
      return remoto;
    }
  }

  const local: AceiteRegistro = {
    version: TERMOS_VERSAO,
    acceptedAt: new Date().toISOString(),
    sincronizado: false,
  };

  salvarLocal(email, local);
  return local;
}
