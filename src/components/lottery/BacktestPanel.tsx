import React, { useState } from 'react';
import { FlaskConical, Info, Loader2, Trophy } from 'lucide-react';

import { BacktestReport, GeneratorStrategy, LotteryDraw, LotteryType } from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';
import { runBacktest } from '@/services/lotteryBacktest';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BacktestPanelProps {
  lottery: LotteryType;
  draws: LotteryDraw[];
}

const ESTRATEGIAS: GeneratorStrategy[] = [
  'ai_smart',
  'balanced',
  'hot',
  'cold',
  'affinity',
  'anti_popular',
  'parity_sum',
];

/**
 * Prova real das estratégias.
 *
 * A tela existe para responder com dados a pergunta que todo apostador faz:
 * "isso aqui funciona?". A resposta honesta costuma ser que nenhuma estratégia
 * supera o acaso de forma consistente — e mostrar isso é o que separa uma
 * ferramenta séria de um vendedor de sorte.
 */
export const BacktestPanel: React.FC<BacktestPanelProps> = ({ lottery, draws }) => {
  const config = LOTTERY_CONFIGS[lottery];

  const [janela, setJanela] = useState(100);
  const [ticketsPorConcurso, setTicketsPorConcurso] = useState(3);
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [relatorio, setRelatorio] = useState<BacktestReport | null>(null);

  const executar = async () => {
    setRodando(true);
    setProgresso(0);
    setRelatorio(null);

    try {
      const resultado = await runBacktest({
        lottery,
        draws,
        strategies: ESTRATEGIAS,
        janela,
        ticketsPorConcurso,
        onProgress: setProgresso,
      });
      setRelatorio(resultado);
    } finally {
      setRodando(false);
    }
  };

  const diferencaMaxima = relatorio
    ? Math.max(...relatorio.resultados.map((r) => Math.abs(r.vantagemSobreAleatorio)))
    : 0;

  // Sem uma diferença que supere o ruído amostral, o veredito é "empate".
  const margemDeRuido = relatorio
    ? Math.max(0.05, relatorio.esperancaTeorica * 0.05)
    : 0;
  const houveVencedor = diferencaMaxima > margemDeRuido;

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="h-5 w-5 text-indigo-600" />
            Prova Real das Estratégias
          </CardTitle>
          <CardDescription>
            Cada concurso da janela é simulado usando apenas os concursos anteriores a ele. Os
            bilhetes são gerados como seriam na véspera do sorteio e só depois comparados com o
            resultado — sem nenhuma chance de o motor espiar o gabarito.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Concursos simulados
              </label>
              <Select
                value={String(janela)}
                onValueChange={(v) => setJanela(Number(v))}
                disabled={rodando}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[50, 100, 200, 300].map((valor) => (
                    <SelectItem key={valor} value={String(valor)}>
                      Últimos {valor} concursos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Bilhetes por concurso
              </label>
              <Select
                value={String(ticketsPorConcurso)}
                onValueChange={(v) => setTicketsPorConcurso(Number(v))}
                disabled={rodando}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 3, 5, 10].map((valor) => (
                    <SelectItem key={valor} value={String(valor)}>
                      {valor} bilhete(s)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={executar}
                disabled={rodando || draws.length < 100}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {rodando ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Simulando...
                  </>
                ) : (
                  <>
                    <FlaskConical className="h-4 w-4 mr-2" />
                    Rodar Simulação
                  </>
                )}
              </Button>
            </div>
          </div>

          {rodando && <Progress value={progresso} className="h-2" />}

          {draws.length < 100 && (
            <p className="text-xs text-amber-600">
              É preciso ao menos 100 concursos carregados para simular com sentido.
            </p>
          )}
        </CardContent>
      </Card>

      {relatorio && (
        <>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Veredito</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <p className="text-xs text-muted-foreground">Esperança matemática</p>
                  <p className="text-2xl font-extrabold">{relatorio.esperancaTeorica}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    acertos médios de um bilhete qualquer
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <p className="text-xs text-muted-foreground">Aleatório medido</p>
                  <p className="text-2xl font-extrabold">{relatorio.baselineAleatorio}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    surpresinha nos mesmos {relatorio.janelaConcursos} concursos
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <p className="text-xs text-muted-foreground">Bilhetes simulados</p>
                  <p className="text-2xl font-extrabold">
                    {relatorio.resultados[0]?.ticketsSimulados ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">por estratégia</p>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    {houveVencedor ? (
                      <p>
                        Nesta janela, <strong>{relatorio.resultados[0].strategyLabel}</strong> ficou
                        à frente da surpresinha por {relatorio.resultados[0].vantagemSobreAleatorio.toFixed(3)}{' '}
                        acerto por bilhete. Uma diferença desse tamanho ainda cabe dentro da
                        variação natural de {relatorio.janelaConcursos} concursos: repita a
                        simulação com outra janela e a ordem provavelmente muda.
                      </p>
                    ) : (
                      <p>
                        Nenhuma estratégia se destacou além do ruído. Todas ficaram a menos de{' '}
                        {margemDeRuido.toFixed(2)} acerto de distância da surpresinha, que é o que a
                        matemática prevê: cada sorteio é independente e nenhuma leitura do passado
                        muda a chance do próximo. O valor real do site está em gastar menos pelo
                        mesmo bilhete e em cobrir faixas com garantia, não em prever dezenas.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Desempenho por estratégia — {config.name}
              </CardTitle>
              <CardDescription>
                {relatorio.janelaConcursos} concursos, {relatorio.ticketsPorConcurso} bilhetes por
                concurso, {relatorio.numbersCount} dezenas por bilhete.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left font-semibold px-4 py-2.5">Estratégia</th>
                      <th className="text-right font-semibold px-4 py-2.5">Acertos médios</th>
                      <th className="text-right font-semibold px-4 py-2.5">vs. aleatório</th>
                      <th className="text-right font-semibold px-4 py-2.5">Melhor</th>
                      <th className="text-right font-semibold px-4 py-2.5">Faixas premiadas</th>
                      <th className="text-right font-semibold px-4 py-2.5">Custo simulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.resultados.map((resultado) => {
                      const ehBaseline = resultado.strategy === 'random';
                      const premiados = resultado.tiers.reduce((soma, t) => soma + t.count, 0);

                      return (
                        <tr
                          key={resultado.strategy}
                          className={`border-t border-slate-100 dark:border-slate-800 ${
                            ehBaseline ? 'bg-slate-50/60 dark:bg-slate-900/40' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5 font-medium">
                            <div className="flex items-center gap-2">
                              {resultado.strategyLabel}
                              {ehBaseline && (
                                <Badge variant="outline" className="text-[10px]">
                                  referência
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold tabular-nums">
                            {resultado.mediaAcertos.toFixed(3)}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                              resultado.vantagemSobreAleatorio > 0
                                ? 'text-emerald-600'
                                : resultado.vantagemSobreAleatorio < 0
                                  ? 'text-red-500'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            {resultado.vantagemSobreAleatorio > 0 ? '+' : ''}
                            {resultado.vantagemSobreAleatorio.toFixed(3)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {resultado.melhorAcerto}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {premiados > 0 ? (
                              <span className="inline-flex items-center gap-1">
                                <Trophy className="h-3 w-3 text-amber-500" />
                                {premiados}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                            R$ {resultado.custoTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
