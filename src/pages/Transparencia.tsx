import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Scale } from 'lucide-react';

import { LotteryType } from '@/types/lottery';
import { LOTTERY_CONFIGS, LOTTERY_ORDER } from '@/constants/lotteryConstants';
import {
  buscarStatusDados,
  buscarTransparencia,
  nomeDaFonte,
  tempoDesde,
  type RelatorioTransparencia,
  type StatusDados,
} from '@/services/lotteryTransparencia';
import { applyPageSeo } from '@/lib/seo';
import { AVISO_CURTO } from '@/constants/termosDeUso';
import { PowerballLogo } from '@/components/lottery/PowerballLogo';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function numero(valor: number, casas = 2): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/**
 * Página pública de transparência: de onde vêm os resultados, se estão em
 * dia, e quanto as estratégias acertaram de verdade — contra o acaso.
 */
export default function Transparencia() {
  const [lottery, setLottery] = useState<LotteryType>('lotofacil');
  const [status, setStatus] = useState<StatusDados | null | undefined>(undefined);
  const [relatorio, setRelatorio] = useState<RelatorioTransparencia | null | undefined>(undefined);

  useEffect(() => {
    applyPageSeo({
      title: 'Transparência — acertos reais e status dos dados | Powerball',
      description:
        'Quantos acertos os palpites do Powerball fizeram de verdade, comparados com o puro acaso, e de onde vêm os resultados das Loterias Caixa.',
      path: '/transparencia',
    });
    void buscarStatusDados().then(setStatus);
  }, []);

  useEffect(() => {
    setRelatorio(undefined);
    void buscarTransparencia(lottery).then(setRelatorio);
  }, [lottery]);

  const config = LOTTERY_CONFIGS[lottery];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Palpites inteligentes
          </Link>
          <PowerballLogo altura={48} />
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-powerball-navy dark:text-white">
            <Scale className="h-7 w-7 text-powerball-gold-dark" />
            Transparência
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Aqui mostramos, sem filtro, quanto os palpites acertaram de verdade e se os resultados
            que usamos estão em dia. Nenhuma estratégia muda a chance de um sorteio; o placar abaixo
            serve para você ver isso com números reais.
          </p>
        </div>

        {/* ---------------------------------------------------------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status dos resultados</CardTitle>
            <CardDescription>
              A API busca os resultados na Caixa e, se ela não responder, num espelho público
              {status?.intervaloMinutos ? `, a cada ${status.intervaloMinutos} minutos` : ''}.
              Se nenhuma fonte responder por 24 horas, a modalidade entra em alerta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === undefined ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : status === null ? (
              <p className="text-sm text-muted-foreground">
                Não conseguimos falar com a API agora. Tente de novo em alguns minutos.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left font-semibold py-2 pr-3">Modalidade</th>
                      <th className="text-left font-semibold py-2 pr-3">Último concurso</th>
                      <th className="text-left font-semibold py-2 pr-3">Última atualização</th>
                      <th className="text-left font-semibold py-2">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.modalidades.map((item) => (
                      <tr key={item.lottery} className="border-t border-slate-100 dark:border-slate-800 align-top">
                        <td className="py-2 pr-3 font-semibold" style={{ color: LOTTERY_CONFIGS[item.lottery]?.color }}>
                          {item.nome}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {item.ultimoConcurso ? (
                            <Link
                              to={`/resultado/${LOTTERY_CONFIGS[item.lottery].slug}/${item.ultimoConcurso}`}
                              className="underline"
                            >
                              {item.ultimoConcurso}
                            </Link>
                          ) : (
                            '—'
                          )}
                          {item.dataUltimoConcurso && (
                            <span className="text-muted-foreground"> • {item.dataUltimoConcurso}</span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {tempoDesde(item.ultimaSincronizacaoOk)}
                          {item.fonteUltimaSincronizacao && (
                            <span className="text-muted-foreground">
                              {' '}
                              via {nomeDaFonte(item.fonteUltimaSincronizacao)}
                            </span>
                          )}
                        </td>
                        <td className="py-2">
                          {item.alerta ? (
                            <span className="inline-flex gap-1 text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              {item.alerta}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" />
                              Em dia
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Placar real das estratégias</CardTitle>
            <CardDescription>
              Só contam bilhetes que chegaram ao nosso servidor antes do sorteio para o qual foram
              feitos, pelo relógio do servidor. Cada um é conferido aqui, contra o resultado
              oficial. A coluna "ao acaso" é a média que qualquer bilhete do mesmo tamanho faria
              escolhendo dezenas no sorteio puro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {LOTTERY_ORDER.map((tipo) => (
                <button key={tipo} type="button" onClick={() => setLottery(tipo)}>
                  <Badge
                    variant={tipo === lottery ? 'default' : 'outline'}
                    style={
                      tipo === lottery
                        ? { backgroundColor: LOTTERY_CONFIGS[tipo].color }
                        : { color: LOTTERY_CONFIGS[tipo].color }
                    }
                    className="cursor-pointer font-semibold"
                  >
                    {LOTTERY_CONFIGS[tipo].name}
                  </Badge>
                </button>
              ))}
            </div>

            {relatorio === undefined ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : relatorio === null ? (
              <p className="text-sm text-muted-foreground">
                Não conseguimos carregar o placar agora. Tente de novo em alguns minutos.
              </p>
            ) : relatorio.bilhetesConferidos === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda não há bilhetes da {config.name} conferidos. O placar começa a encher depois
                do próximo sorteio.
                {relatorio.bilhetesAguardando > 0 &&
                  ` ${relatorio.bilhetesAguardando} bilhete(s) aguardando o sorteio.`}
              </p>
            ) : (
              <>
                <p className="text-sm">
                  <strong>{relatorio.bilhetesConferidos.toLocaleString('pt-BR')}</strong> bilhetes
                  conferidos em <strong>{relatorio.concursos}</strong> concurso(s)
                  {relatorio.primeiroConcurso !== relatorio.ultimoConcurso
                    ? ` (do ${relatorio.primeiroConcurso} ao ${relatorio.ultimoConcurso})`
                    : ` (${relatorio.ultimoConcurso})`}
                  , de {relatorio.usuarios} pessoa(s).
                  {relatorio.bilhetesDescartados > 0 &&
                    ` ${relatorio.bilhetesDescartados} bilhete(s) gravados depois do sorteio ficaram de fora.`}
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left font-semibold py-2 pr-3">Estratégia</th>
                        <th className="text-right font-semibold py-2 px-2">Bilhetes</th>
                        <th className="text-right font-semibold py-2 px-2">Média de acertos</th>
                        <th className="text-right font-semibold py-2 px-2">Ao acaso</th>
                        <th className="text-right font-semibold py-2 px-2">Diferença</th>
                        <th className="text-right font-semibold py-2 pl-2">Melhor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorio.estrategias.map((item) => (
                        <tr key={item.strategy} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-2 pr-3 font-medium">{item.strategyLabel}</td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            {item.bilhetes.toLocaleString('pt-BR')}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">{numero(item.mediaAcertos)}</td>
                          <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                            {numero(item.mediaEsperada)}
                          </td>
                          <td
                            className={`py-2 px-2 text-right tabular-nums font-semibold ${
                              item.diferenca > 0
                                ? 'text-emerald-700'
                                : item.diferenca < 0
                                  ? 'text-rose-700'
                                  : ''
                            }`}
                          >
                            {item.diferenca > 0 ? '+' : ''}
                            {numero(item.diferenca)}
                          </td>
                          <td className="py-2 pl-2 text-right tabular-nums">{item.melhorAcerto}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-muted-foreground">
                  Diferenças pequenas, para cima ou para baixo, são o esperado de um sorteio justo:
                  com poucos bilhetes o acaso oscila bastante. Só uma diferença que se mantenha com
                  milhares de bilhetes diria algo — e nenhum estudo sério encontrou isso em
                  loterias.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Como ler estes números</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">Placar real</strong> é o que aconteceu com bilhetes
              de verdade, feitos antes do sorteio. É a prova mais honesta que existe.
            </p>
            <p>
              <strong className="text-foreground">Prova Real</strong> (aba dentro do site) simula as
              estratégias nos concursos passados. É útil para comparar, mas é simulação.
            </p>
            <p>
              As estratégias servem para montar jogos equilibrados e evitar combinações muito
              populares, o que pode reduzir a divisão do prêmio. Elas não aumentam a chance de
              acertar.
            </p>
          </CardContent>
        </Card>

        <footer className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-1.5">
          <p className="text-[11px] leading-relaxed text-muted-foreground">{AVISO_CURTO}</p>
          <p className="text-[11px] text-muted-foreground">
            <Link to="/termos" className="font-semibold underline hover:text-foreground">
              Termo de Uso
            </Link>
            {' • '}
            <Link to={`/resultados/${config.slug}`} className="font-semibold underline hover:text-foreground">
              Todos os resultados
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
