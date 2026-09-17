import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, MapPin, Sparkles, Trophy } from 'lucide-react';

import { LotteryDraw, LotteryType } from '@/types/lottery';
import { LOTTERY_CONFIGS, LOTTERY_ORDER, lotteryFromSlug } from '@/constants/lotteryConstants';
import { getDrawByConcurso, getLotteryHistory } from '@/services/lotteryApiService';
import { applyPageSeo } from '@/lib/seo';
import { AVISO_CURTO } from '@/constants/termosDeUso';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Página pública de resultado de um concurso.
 *
 * Existe por dois motivos: é o que as pessoas procuram no Google ("resultado
 * lotofácil 3058") e é a porta de entrada mais barata para o gerador. Cada
 * concurso vira uma URL própria, com título, descrição e dados estruturados.
 */
export default function LotteryResultado() {
  const { lottery: slug, concurso } = useParams<{ lottery: string; concurso?: string }>();
  const navigate = useNavigate();

  const lottery = useMemo<LotteryType | null>(() => lotteryFromSlug(slug ?? ''), [slug]);

  const [draw, setDraw] = useState<LotteryDraw | null>(null);
  const [ultimoConcurso, setUltimoConcurso] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      if (!lottery) {
        setCarregando(false);
        return;
      }

      setCarregando(true);

      const historico = await getLotteryHistory(lottery);
      const maisRecente = historico.draws[0]?.concurso ?? null;
      if (ativo) setUltimoConcurso(maisRecente);

      const alvo = concurso ? Number(concurso) : maisRecente;
      if (!alvo) {
        if (ativo) setCarregando(false);
        return;
      }

      const resultado =
        historico.draws.find((d) => d.concurso === alvo) ??
        (await getDrawByConcurso(lottery, alvo));

      if (ativo) {
        setDraw(resultado);
        setCarregando(false);
      }
    };

    void carregar();
    return () => {
      ativo = false;
    };
  }, [lottery, concurso]);

  useEffect(() => {
    if (!lottery || !draw) return;

    const config = LOTTERY_CONFIGS[lottery];
    const dezenas = draw.dezenas.map((n) => String(n).padStart(2, '0')).join(' - ');

    applyPageSeo({
      title: `Resultado ${config.name} ${draw.concurso} — ${draw.data} | Dezenas sorteadas`,
      description:
        `Resultado oficial do concurso ${draw.concurso} da ${config.name}, realizado em ${draw.data}. ` +
        `Dezenas sorteadas: ${dezenas}.${draw.acumulou ? ' O prêmio principal acumulou.' : ''}`,
      path: `/resultado/${config.slug}/${draw.concurso}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: `Resultado ${config.name} ${draw.concurso}`,
        datePublished: draw.data,
        articleBody: `Dezenas sorteadas no concurso ${draw.concurso} da ${config.name}: ${dezenas}.`,
      },
    });
  }, [lottery, draw]);

  if (!lottery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold">Modalidade não encontrada.</p>
        <Button onClick={() => navigate('/')}>Ir para os palpites</Button>
      </div>
    );
  }

  const config = LOTTERY_CONFIGS[lottery];
  const numero = draw?.concurso ?? Number(concurso ?? 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Palpites inteligentes
          </Link>

          <div className="flex flex-wrap gap-1.5">
            {LOTTERY_ORDER.map((tipo) => (
              <Link key={tipo} to={`/resultado/${LOTTERY_CONFIGS[tipo].slug}`}>
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
              </Link>
            ))}
          </div>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: config.color }} />

          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl font-extrabold">
              Resultado {config.name} — Concurso {numero || '—'}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-3">
              {draw?.data && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {draw.data}
                </span>
              )}
              {draw?.local && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {draw.local}
                </span>
              )}
              {draw?.acumulou && (
                <Badge className="bg-amber-500 text-amber-950 font-bold">Acumulou</Badge>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {carregando ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Carregando resultado oficial...
              </p>
            ) : !draw ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Não encontramos o concurso {numero} da {config.name}.
              </p>
            ) : (
              <>
                <div className="space-y-3">
                  {config.hasSecondDraw && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      1º sorteio
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {draw.dezenas.map((n) => (
                      <span
                        key={n}
                        className="w-12 h-12 rounded-full text-white font-extrabold text-lg flex items-center justify-center shadow"
                        style={{ backgroundColor: config.color }}
                      >
                        {String(n).padStart(2, '0')}
                      </span>
                    ))}
                  </div>

                  {draw.dezenasSegundoSorteio?.length ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">
                        2º sorteio
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {draw.dezenasSegundoSorteio.map((n) => (
                          <span
                            key={`s2-${n}`}
                            className="w-12 h-12 rounded-full bg-slate-700 text-white font-extrabold text-lg flex items-center justify-center shadow"
                          >
                            {String(n).padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {(draw.mesSorte || draw.trevos?.length) && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {draw.mesSorte ? 'Mês da Sorte' : 'Trevos'}
                      </span>
                      <Badge className="bg-amber-400 text-amber-950 font-bold">
                        {draw.mesSorte ?? draw.trevos?.join(' e ')}
                      </Badge>
                    </div>
                  )}
                </div>

                {draw.premiacoes?.length ? (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="text-left font-semibold px-4 py-2">Faixa</th>
                          <th className="text-right font-semibold px-4 py-2">Ganhadores</th>
                          <th className="text-right font-semibold px-4 py-2">Prêmio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draw.premiacoes.map((faixa, idx) => (
                          <tr
                            key={`${faixa.faixa}-${idx}`}
                            className="border-t border-slate-100 dark:border-slate-800"
                          >
                            <td className="px-4 py-2 font-medium">{faixa.descricao}</td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              {faixa.ganhadores.toLocaleString('pt-BR')}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              {faixa.valorPremio > 0
                                ? faixa.valorPremio.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  })
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex gap-2">
                    {numero > 1 && (
                      <Link to={`/resultado/${config.slug}/${numero - 1}`}>
                        <Button variant="outline" size="sm">
                          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                          Concurso {numero - 1}
                        </Button>
                      </Link>
                    )}
                    {ultimoConcurso !== null && numero < ultimoConcurso && (
                      <Link to={`/resultado/${config.slug}/${numero + 1}`}>
                        <Button variant="outline" size="sm">
                          Concurso {numero + 1}
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>

                  <Link to="/">
                    <Button
                      size="sm"
                      style={{ backgroundColor: config.color }}
                      className="text-white font-bold"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Gerar palpites para o próximo
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Como funciona a {config.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1.5">
            <p>
              Marque de {config.minSelection} a {config.maxSelection} dezenas entre 1 e{' '}
              {config.totalNumbers}. A aposta mínima custa R$ {config.basePrice.toFixed(2)} e os
              sorteios acontecem {config.drawDays.join(', ').toLowerCase()}.
            </p>
            <p>
              A chance de acertar a faixa principal com uma aposta simples é de 1 em{' '}
              {config.mainPrizeOdds.toLocaleString('pt-BR')}.
            </p>
          </CardContent>
        </Card>

        <footer className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-1.5">
          <p className="text-[11px] leading-relaxed text-muted-foreground">{AVISO_CURTO}</p>
          <p className="text-[11px] text-muted-foreground">
            Resultado divulgado apenas a título informativo. O resultado oficial é o publicado pela
            Caixa Econômica Federal.{' '}
            <Link to="/termos" className="font-semibold underline hover:text-foreground">
              Termo de Uso
            </Link>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}
