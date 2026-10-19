import React, { useMemo, useState } from 'react';
import { Calculator, CheckCircle2, Layers, Scale, Store } from 'lucide-react';

import { FechamentoPlan, LotteryType } from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';
import { getFechamentosByLottery } from '@/services/lotteryFechamento';
import {
  formatarProbabilidade,
  simularVolante,
  tamanhosDeVolante,
} from '@/services/lotterySimulador';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SimuladorVolanteProps {
  lottery: LotteryType;
  onAbrirFechamento?: (plano: FechamentoPlan) => void;
}

const reais = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const SimuladorVolante: React.FC<SimuladorVolanteProps> = ({ lottery, onAbrirFechamento }) => {
  const config = LOTTERY_CONFIGS[lottery];
  const tamanhos = tamanhosDeVolante(lottery);
  const padrao = tamanhos.includes(config.minSelection + 2)
    ? config.minSelection + 2
    : tamanhos[0];
  const [escolha, setEscolha] = useState<{ lottery: LotteryType; dezenas: number }>({
    lottery,
    dezenas: padrao,
  });
  const dezenas = escolha.lottery === lottery ? escolha.dezenas : padrao;

  const simulacao = useMemo(
    () => simularVolante(lottery, dezenas, getFechamentosByLottery(lottery)),
    [lottery, dezenas],
  );

  const premioMaximo =
    lottery === 'maismilionaria'
      ? 'os 6 acertos (a faixa máxima ainda depende dos trevos)'
      : `o prêmio máximo (${config.prizeTiers[0]?.label ?? 'faixa principal'})`;
  const m = config.minSelection;
  const fechamentos = simulacao.fechamentos.slice(0, 2);
  const faixaDe = (hits: number) =>
    config.prizeTiers.find((t) => t.hits === hits)?.label ?? `${hits} acertos`;

  return (
    <div className="space-y-6">
      <Card className="border-powerball-gold/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5 text-powerball-gold-dark" />
            Volante cheio ou jogos menores?
          </CardTitle>
          <CardDescription>
            A conta que ninguém faz para você na lotérica: quanto custa garantir o prêmio máximo
            com as suas dezenas, e quanto dá para economizar abrindo mão dele.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Quantas dezenas você quer jogar na {config.name}?
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tamanhos.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEscolha({ lottery, dezenas: n })}
                  className={`min-w-10 px-2.5 py-1 rounded-full border text-sm font-bold transition-colors ${
                    n === dezenas
                      ? 'bg-powerball-navy border-powerball-navy text-white'
                      : 'border-slate-300 dark:border-slate-700 hover:border-powerball-navy'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-sm space-y-2">
            <p>
              Com <b>{dezenas} dezenas</b> existem{' '}
              <b>{simulacao.combinacoes.toLocaleString('pt-BR')} combinações</b> de {m} números. A
              Caixa cobra <b>{reais(simulacao.precoCombinacao)} por combinação</b>, seja qual for o
              formato da aposta.
            </p>
            <p>
              Para garantir {premioMaximo} caso as {m} sorteadas saiam entre as suas {dezenas}, é
              preciso ter todas elas:{' '}
              <b className="text-powerball-navy dark:text-powerball-gold">
                {reais(simulacao.custoMinimo)} é o mínimo possível
              </b>
              . Nenhuma mistura de volantes menores sai mais barata.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 pr-3">Montagem</th>
                  <th className="py-2 pr-3 text-right">Bilhetes</th>
                  <th className="py-2 pr-3 text-right">Custo</th>
                  <th className="py-2">Garante o prêmio máximo?</th>
                </tr>
              </thead>
              <tbody>
                {simulacao.montagens.map((montagem) => {
                  const minimo = Math.abs(montagem.custo - simulacao.custoMinimo) < 0.005;
                  return (
                    <tr
                      key={montagem.descricao}
                      className="border-b border-slate-100 dark:border-slate-800/60"
                    >
                      <td className="py-2 pr-3">{montagem.descricao}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {montagem.bilhetes.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 pr-3 text-right font-bold tabular-nums">
                        {reais(montagem.custo)}
                      </td>
                      <td className="py-2 text-xs">
                        {minimo ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            Sim, pelo mínimo
                          </span>
                        ) : (
                          <span className="text-rose-700 dark:text-rose-400">
                            Sim, mas paga {montagem.repetidas.toLocaleString('pt-BR')}{' '}
                            {montagem.repetidas === 1 ? 'combinação repetida' : 'combinações repetidas'}{' '}
                            {`(+${reais(montagem.custo - simulacao.custoMinimo)})`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground">Por que não existe atalho</p>
            <p>
              Um volante de {dezenas - 1} dezenas custa exatamente o mesmo que as combinações de {m}{' '}
              que ele contém. E dois volantes de {dezenas - 1} tirados das mesmas {dezenas} dezenas
              sempre têm combinações em comum: você paga duas vezes pela mesma aposta. O melhor que
              uma mistura consegue é empatar com o volante cheio.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-emerald-600" />
            O que cada opção paga com {dezenas} dezenas
          </CardTitle>
          <CardDescription>
            Conforme quantas das {m} sorteadas caírem entre as suas {dezenas}. A chance de cada
            linha é a mesma para o volante cheio e para o fechamento; muda o que você recebe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 pr-3">Das {m} sorteadas, nas suas</th>
                  <th className="py-2 pr-3">Chance de cair assim</th>
                  <th className="py-2 pr-3">Volante cheio ({reais(simulacao.custoMinimo)})</th>
                  {fechamentos.map((plano) => (
                    <th key={plano.id} className="py-2 pr-3">
                      Fechamento {plano.ticketsCount} jogos ({reais(plano.totalCost)})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {simulacao.linhas.map((linha) => (
                  <tr key={linha.acertos} className="border-b border-slate-100 dark:border-slate-800/60 align-top">
                    <td className="py-2 pr-3 font-bold">{linha.acertos}</td>
                    <td className="py-2 pr-3 text-xs tabular-nums">{formatarProbabilidade(linha.chance)}</td>
                    <td className="py-2 pr-3 text-xs">
                      {linha.premiosVolante.length > 0
                        ? linha.premiosVolante
                            .map((p) => `${p.quantidade.toLocaleString('pt-BR')} ${p.faixa}`)
                            .join(' + ')
                        : 'Nada'}
                    </td>
                    {fechamentos.map((plano) => (
                      <td key={plano.id} className="py-2 pr-3 text-xs">
                        {linha.acertos >= plano.conditionHit ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            Pelo menos 1 {faixaDe(plano.guaranteedHit)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Sem garantia</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {config.hasSecondDraw && (
            <p className="text-xs text-muted-foreground">
              Na {config.name} a conta vale para cada um dos dois sorteios do concurso.
            </p>
          )}
          {lottery === 'maismilionaria' && (
            <p className="text-xs text-muted-foreground">
              Na +Milionária a tabela conta só as dezenas; a faixa exata também depende dos trevos.
              Os custos consideram 2 trevos por aposta.
            </p>
          )}

          {fechamentos.length > 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm space-y-3">
              <p className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Quer gastar menos? Abra mão do prêmio máximo garantido
              </p>
              <div className="space-y-2">
                {fechamentos.map((plano) => (
                  <div
                    key={plano.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <p className="text-emerald-900 dark:text-emerald-200">
                      <b>
                        {plano.ticketsCount} jogos por {reais(plano.totalCost)}
                      </b>{' '}
                      garantem pelo menos 1 {faixaDe(plano.guaranteedHit)} se {plano.conditionHit} das{' '}
                      {m} sorteadas estiverem nas suas {dezenas}. Custa{' '}
                      {Math.round((plano.totalCost / simulacao.custoMinimo) * 100)}% do volante cheio
                      porque garante uma faixa menor.
                    </p>
                    {onAbrirFechamento && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs border-emerald-400 text-emerald-800 dark:text-emerald-200"
                        onClick={() => onAbrirFechamento(plano)}
                      >
                        <Layers className="h-3.5 w-3.5 mr-1" />
                        Montar este fechamento
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80">
                A economia vem de jogar menos combinações. Com todas as {m} nas suas {dezenas}, o
                fechamento pode até pegar {premioMaximo}, mas sem certeza.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ainda não há fechamento com garantia para {dezenas} dezenas na {config.name}. Para
              essa quantidade, a opção é o volante cheio.
            </p>
          )}

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-muted-foreground flex gap-2">
            <Store className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Na lotérica você escolhe entre aposta simples, volante cheio ou cota de bolão, sem ver
              essa comparação. Aqui você vê o custo de cada caminho e o que ele garante antes de
              decidir. Nenhuma opção aumenta a chance de cada combinação: o que muda é quanto você
              paga e o que fica garantido.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
