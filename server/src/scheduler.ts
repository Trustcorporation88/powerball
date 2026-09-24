import type { FastifyBaseLogger } from "fastify";
import { env } from "./env.js";
import {
  LOTTERIES,
  type Lottery,
  limparLogsAntigos,
  refreshLottery,
  statusDasModalidades,
} from "./lotteryData.js";

/**
 * Sincronização automática.
 *
 * Sem ela o banco só se atualizava quando alguém abria o site, e o concurso
 * da Carteira ficava parado até a próxima visita. Roda na própria API porque
 * o Railway mantém uma instância sempre ligada.
 */

const ATRASO_INICIAL_MS = 15_000;

/** Modalidades já avisadas, para mandar um alerta por problema, não um por hora. */
const alertados = new Set<Lottery>();

async function enviarAlerta(texto: string, log: FastifyBaseLogger): Promise<void> {
  log.error(`[alerta] ${texto}`);
  if (!env.ALERT_WEBHOOK_URL) return;

  try {
    await fetch(env.ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // "content" é o campo do Discord e "text" o do Slack; mandar os dois
      // cobre ambos sem configuração extra.
      body: JSON.stringify({ content: texto, text: texto }),
    });
  } catch (error) {
    log.warn(error, "[alerta] webhook não respondeu");
  }
}

export async function rodarCiclo(log: FastifyBaseLogger): Promise<void> {
  for (const lottery of LOTTERIES) {
    await refreshLottery(lottery, log, { force: true });
  }

  const status = await statusDasModalidades();
  for (const item of status) {
    if (item.alerta && !alertados.has(item.lottery)) {
      alertados.add(item.lottery);
      await enviarAlerta(`Powerball — ${item.nome}: ${item.alerta}`, log);
    } else if (!item.alerta && alertados.has(item.lottery)) {
      alertados.delete(item.lottery);
      await enviarAlerta(
        `Powerball — ${item.nome}: normalizado, concurso ${item.ultimoConcurso ?? "?"}.`,
        log,
      );
    }
  }

  await limparLogsAntigos().catch((error) => log.warn(error));
}

export function iniciarAgendador(log: FastifyBaseLogger): () => void {
  const minutos = env.SYNC_INTERVAL_MINUTES;
  if (!Number.isFinite(minutos) || minutos <= 0) {
    log.info("[agendador] sincronização automática desligada");
    return () => undefined;
  }

  let rodando = false;
  const executar = async () => {
    if (rodando) return;
    rodando = true;
    try {
      await rodarCiclo(log);
    } catch (error) {
      log.error(error, "[agendador] ciclo falhou");
    } finally {
      rodando = false;
    }
  };

  const inicial = setTimeout(executar, ATRASO_INICIAL_MS);
  const intervalo = setInterval(executar, minutos * 60 * 1000);
  log.info(`[agendador] sincronizando a cada ${minutos} min`);

  return () => {
    clearTimeout(inicial);
    clearInterval(intervalo);
  };
}
