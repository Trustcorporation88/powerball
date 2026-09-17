import React, { useMemo, useState } from 'react';
import { Copy, Plus, Trash2, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { Bolao, BolaoParticipant, GeneratedGame, LotteryType, UserSavedGame } from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';
import {
  calcularRateio,
  createBolao,
  formatBolaoForWhatsApp,
  getBoloes,
  removeBolao,
  saveBolao,
} from '@/services/lotteryBolao';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface BolaoPanelProps {
  lottery: LotteryType;
  /** Bilhetes disponíveis para compor um bolão (gerados ou salvos). */
  candidatos: Array<GeneratedGame | UserSavedGame>;
  concursoAlvo?: number;
}

/**
 * Organização de bolões.
 *
 * O que costuma azedar um bolão não é a sorte, é a conta: quem pagou, quanto
 * cada um recebe, quem entrou depois. Aqui tudo é derivado das cotas, e o
 * resumo sai pronto para colar no grupo.
 */
export const BolaoPanel: React.FC<BolaoPanelProps> = ({ lottery, candidatos, concursoAlvo }) => {
  const config = LOTTERY_CONFIGS[lottery];

  const [boloes, setBoloes] = useState<Bolao[]>(() => getBoloes());
  const [nome, setNome] = useState('');
  const [taxa, setTaxa] = useState(0);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [participantes, setParticipantes] = useState<BolaoParticipant[]>([
    { id: `p_${Date.now()}`, nome: '', cotas: 1, pago: false },
  ]);

  const doLottery = boloes.filter((b) => b.lottery === lottery);

  const jogosEscolhidos = useMemo(
    () => candidatos.filter((game) => selecionados.includes(game.id)),
    [candidatos, selecionados],
  );

  const custoPrevisto = useMemo(
    () => jogosEscolhidos.reduce((soma, game) => soma + game.cost, 0),
    [jogosEscolhidos],
  );

  const totalCotas = participantes.reduce((soma, p) => soma + Math.max(0, p.cotas), 0);

  const alternarJogo = (id: string) => {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id],
    );
  };

  const atualizarParticipante = (id: string, campo: keyof BolaoParticipant, valor: unknown) => {
    setParticipantes((atual) =>
      atual.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)),
    );
  };

  const adicionarParticipante = () => {
    setParticipantes((atual) => [
      ...atual,
      { id: `p_${Date.now()}_${atual.length}`, nome: '', cotas: 1, pago: false },
    ]);
  };

  const removerParticipante = (id: string) => {
    setParticipantes((atual) => (atual.length > 1 ? atual.filter((p) => p.id !== id) : atual));
  };

  const criar = () => {
    const validos = participantes.filter((p) => p.nome.trim().length > 0 && p.cotas > 0);

    if (jogosEscolhidos.length === 0) {
      toast.warning('Escolha ao menos um bilhete para o bolão.');
      return;
    }
    if (validos.length < 2) {
      toast.warning('Um bolão precisa de pelo menos 2 participantes com nome e cotas.');
      return;
    }

    const criado = createBolao({
      nome,
      lottery,
      games: jogosEscolhidos,
      participantes: validos,
      concursoAlvo,
      taxaAdministracao: taxa,
    });

    setBoloes(getBoloes());
    setNome('');
    setSelecionados([]);
    setParticipantes([{ id: `p_${Date.now()}`, nome: '', cotas: 1, pago: false }]);

    toast.success(`Bolão "${criado.nome}" criado com ${criado.games.length} bilhetes.`);
  };

  const alternarPagamento = (bolao: Bolao, participanteId: string) => {
    const atualizado: Bolao = {
      ...bolao,
      participantes: bolao.participantes.map((p) =>
        p.id === participanteId ? { ...p, pago: !p.pago } : p,
      ),
    };
    saveBolao(atualizado);
    setBoloes(getBoloes());
  };

  const copiarResumo = async (bolao: Bolao) => {
    try {
      await navigator.clipboard.writeText(formatBolaoForWhatsApp(bolao));
      toast.success('Resumo copiado. É só colar no grupo.');
    } catch {
      toast.error('Não foi possível copiar o resumo.');
    }
  };

  const excluir = (bolaoId: string) => {
    removeBolao(bolaoId);
    setBoloes(getBoloes());
    toast.success('Bolão removido.');
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-cyan-600" />
            Montar Bolão de {config.name}
          </CardTitle>
          <CardDescription>
            Escolha os bilhetes, cadastre os cotistas e o rateio sai calculado. Quem compra duas
            cotas paga o dobro e recebe o dobro.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Nome do bolão</label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={`Bolão ${config.name} da firma`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Taxa de administração (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={taxa}
                onChange={(e) => setTaxa(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Bilhetes ({selecionados.length} de {candidatos.length} selecionados)
            </p>

            {candidatos.length === 0 ? (
              <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4">
                Gere ou salve bilhetes primeiro — eles aparecem aqui para compor o bolão.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {candidatos.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => alternarJogo(game.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
                      selecionados.includes(game.id)
                        ? 'bg-cyan-50 dark:bg-cyan-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span className="font-mono text-xs tracking-tight">
                      {game.numbers.map((n) => String(n).padStart(2, '0')).join(' ')}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      R$ {game.cost.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Cotistas</p>
              <Button type="button" variant="outline" size="sm" onClick={adicionarParticipante}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </div>

            {participantes.map((participante) => (
              <div key={participante.id} className="flex items-center gap-2">
                <Input
                  value={participante.nome}
                  onChange={(e) => atualizarParticipante(participante.id, 'nome', e.target.value)}
                  placeholder="Nome do cotista"
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={1}
                  value={participante.cotas}
                  onChange={(e) =>
                    atualizarParticipante(participante.id, 'cotas', Number(e.target.value))
                  }
                  className="w-20"
                  title="Cotas"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removerParticipante(participante.id)}
                  disabled={participantes.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-sm">
              <span className="font-semibold">R$ {custoPrevisto.toFixed(2)}</span>
              <span className="text-muted-foreground"> em {jogosEscolhidos.length} bilhetes</span>
              {totalCotas > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  • R$ {(custoPrevisto / totalCotas).toFixed(2)} por cota ({totalCotas} cotas)
                </span>
              )}
            </div>
            <Button onClick={criar} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold">
              Criar Bolão
            </Button>
          </div>
        </CardContent>
      </Card>

      {doLottery.length > 0 && (
        <div className="space-y-4">
          {doLottery.map((bolao) => {
            const rateio = calcularRateio(bolao);

            return (
              <Card key={bolao.id} className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{bolao.nome}</CardTitle>
                      <CardDescription>
                        {bolao.games.length} bilhetes • {rateio.totalCotas} cotas • criado em{' '}
                        {new Date(bolao.createdAt).toLocaleDateString('pt-BR')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => copiarResumo(bolao)}>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Resumo
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => excluir(bolao.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-3 text-sm">
                    <Badge variant="outline" className="font-semibold">
                      <Wallet className="h-3 w-3 mr-1" />
                      Custo R$ {rateio.custoTotal.toFixed(2)}
                    </Badge>
                    <Badge variant="outline" className="font-semibold">
                      Cota R$ {rateio.valorPorCota.toFixed(2)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`font-semibold ${
                        rateio.pendente > 0 ? 'text-amber-600 border-amber-300' : 'text-emerald-600 border-emerald-300'
                      }`}
                    >
                      {rateio.pendente > 0
                        ? `Falta receber R$ ${rateio.pendente.toFixed(2)}`
                        : 'Totalmente pago'}
                    </Badge>
                  </div>

                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {rateio.participantes.map(({ participante, valorDevido, percentual }) => (
                      <div
                        key={participante.id}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{participante.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {participante.cotas} cota(s) • {percentual}% do prêmio
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold tabular-nums">
                            R$ {valorDevido.toFixed(2)}
                          </span>
                          <Button
                            variant={participante.pago ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => alternarPagamento(bolao, participante.id)}
                            className={
                              participante.pago ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                            }
                          >
                            {participante.pago ? 'Pago' : 'Pendente'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
