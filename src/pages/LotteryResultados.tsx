import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ListOrdered, Search } from 'lucide-react';

import { LotteryDraw, LotteryType } from '@/types/lottery';
import { LOTTERY_CONFIGS, LOTTERY_ORDER, lotteryFromSlug } from '@/constants/lotteryConstants';
import { getLotteryHistory } from '@/services/lotteryApiService';
import { applyPageSeo } from '@/lib/seo';
import { AVISO_CURTO } from '@/constants/termosDeUso';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const POR_PAGINA = 30;

function faixaPrincipal(draw: LotteryDraw) {
  if (!draw.premiacoes?.length) return null;
  return [...draw.premiacoes].sort((a, b) => a.faixa - b.faixa)[0];
}

/** Lista pública de todos os concursos de uma modalidade, com a faixa principal. */
export default function LotteryResultados() {
  const { lottery: slug } = useParams<{ lottery: string }>();
  const [parametros, setParametros] = useSearchParams();
  const navigate = useNavigate();

  const lottery = useMemo<LotteryType | null>(() => lotteryFromSlug(slug ?? ''), [slug]);
  const [draws, setDraws] = useState<LotteryDraw[] | null>(null);
  const [busca, setBusca] = useState('');

  const pagina = Math.max(1, Number(parametros.get('pagina')) || 1);

  useEffect(() => {
    if (!lottery) return;
    let ativo = true;
    setDraws(null);
    void getLotteryHistory(lottery).then((historico) => {
      if (ativo) setDraws(historico.draws);
    });
    return () => {
      ativo = false;
    };
  }, [lottery]);

  useEffect(() => {
    if (!lottery) return;
    const config = LOTTERY_CONFIGS[lottery];
    applyPageSeo({
      title: `Todos os resultados da ${config.name} — concursos e premiação | Powerball`,
      description: `Lista de todos os concursos da ${config.name} com dezenas sorteadas, ganhadores e prêmio da faixa principal.`,
      path: `/resultados/${config.slug}`,
    });
  }, [lottery]);

  if (!lottery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold">Modalidade não encontrada.</p>
        <Button onClick={() => navigate('/resultados/lotofacil')}>Ver resultados da Lotofácil</Button>
      </div>
    );
  }

  const config = LOTTERY_CONFIGS[lottery];
  const total = draws?.length ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaAtual = Math.min(pagina, paginas);
  const visiveis = draws?.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA) ?? [];

  const irPara = (destino: number) => {
    setParametros(destino > 1 ? { pagina: String(destino) } : {});
    window.scrollTo({ top: 0 });
  };

  const buscar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const concurso = Number(busca);
    if (Number.isInteger(concurso) && concurso > 0) {
      navigate(`/resultado/${config.slug}/${concurso}`);
    }
  };

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

          <div className="flex flex-wrap gap-1.5">
            {LOTTERY_ORDER.map((tipo) => (
              <Link key={tipo} to={`/resultados/${LOTTERY_CONFIGS[tipo].slug}`}>
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

        <Card className="overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: config.color }} />
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl font-extrabold flex items-center gap-2">
              <ListOrdered className="h-6 w-6" style={{ color: config.color }} />
              Resultados da {config.name}
            </CardTitle>
            <CardDescription>
              {draws ? `${total.toLocaleString('pt-BR')} concursos. ` : ''}
              Clique num concurso para ver todas as faixas de premiação.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={buscar} className="flex gap-2 max-w-xs">
              <Input
                type="number"
                min={1}
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Ir para o concurso nº"
                aria-label="Número do concurso"
              />
              <Button type="submit" variant="outline" size="icon" aria-label="Buscar concurso">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            {!draws ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando concursos...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left font-semibold py-2 pr-3">Concurso</th>
                      <th className="text-left font-semibold py-2 pr-3">Data</th>
                      <th className="text-left font-semibold py-2 pr-3">Dezenas</th>
                      <th className="text-right font-semibold py-2 pl-3">Faixa principal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((draw) => {
                      const principal = faixaPrincipal(draw);
                      return (
                        <tr key={draw.concurso} className="border-t border-slate-100 dark:border-slate-800 align-top">
                          <td className="py-2 pr-3 font-bold tabular-nums">
                            <Link to={`/resultado/${config.slug}/${draw.concurso}`} className="underline">
                              {draw.concurso}
                            </Link>
                          </td>
                          <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{draw.data}</td>
                          <td className="py-2 pr-3 tabular-nums">
                            {draw.dezenas.map((n) => String(n).padStart(2, '0')).join(' ')}
                            {draw.dezenasSegundoSorteio?.length ? (
                              <div className="text-muted-foreground">
                                2º: {draw.dezenasSegundoSorteio.map((n) => String(n).padStart(2, '0')).join(' ')}
                              </div>
                            ) : null}
                            {(draw.mesSorte || draw.trevos?.length) && (
                              <div className="text-muted-foreground">
                                {draw.mesSorte ? `Mês: ${draw.mesSorte}` : `Trevos: ${draw.trevos?.join(' e ')}`}
                              </div>
                            )}
                          </td>
                          <td className="py-2 pl-3 text-right whitespace-nowrap">
                            {principal ? (
                              principal.ganhadores > 0 ? (
                                <>
                                  {principal.ganhadores.toLocaleString('pt-BR')} ganhador(es)
                                  <div className="text-muted-foreground tabular-nums">
                                    {principal.valorPremio.toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    })}
                                  </div>
                                </>
                              ) : (
                                <Badge className="bg-amber-500 text-amber-950 font-bold">Acumulou</Badge>
                              )
                            ) : draw.acumulou ? (
                              <Badge className="bg-amber-500 text-amber-950 font-bold">Acumulou</Badge>
                            ) : (
                              <span className="text-muted-foreground">ver detalhes</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {draws && paginas > 1 && (
              <div className="flex items-center justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={paginaAtual <= 1}
                  onClick={() => irPara(paginaAtual - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Mais novos
                </Button>
                <span className="text-xs text-muted-foreground">
                  Página {paginaAtual} de {paginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={paginaAtual >= paginas}
                  onClick={() => irPara(paginaAtual + 1)}
                >
                  Mais antigos
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <footer className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-1.5">
          <p className="text-[11px] leading-relaxed text-muted-foreground">{AVISO_CURTO}</p>
          <p className="text-[11px] text-muted-foreground">
            Resultados apenas informativos. O oficial é o publicado pela Caixa Econômica Federal.{' '}
            <Link to="/transparencia" className="font-semibold underline hover:text-foreground">
              Transparência
            </Link>
            {' • '}
            <Link to="/termos" className="font-semibold underline hover:text-foreground">
              Termo de Uso
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
