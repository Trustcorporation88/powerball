import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LotteryType,
  LotteryDraw,
  LotteryStats,
  GeneratedGame,
  GeneratorStrategy,
  FechamentoPlan,
  LotteryExtraSelection,
  LotteryTab,
  UserSavedGame,
} from '@/types/lottery';
import { LOTTERY_CONFIGS, LOTTERY_ORDER } from '@/constants/lotteryConstants';
import { getLotteryHistory, type LotterySource } from '@/services/lotteryApiService';
import { calculateLotteryStats } from '@/services/lotteryHistoricalData';
import { generateLotteryGames } from '@/services/lotteryGenerator';
import {
  FECHAMENTOS_CATALOG,
  executeFechamento,
  getFechamentosByLottery,
} from '@/services/lotteryFechamento';
import { isCloudSyncAvailable, pushWallet, syncWallet } from '@/services/lotteryCloudSync';
import {
  descreverConferencia,
  notificarConferencia,
  verificarNovosResultados,
} from '@/services/lotteryNotifications';
import {
  getSavedGames,
  saveGame,
  removeSavedGame,
  replaceSavedGames,
  setConcursoAlvo,
  toggleBetStatus,
  formatGamesForWhatsApp,
  exportGamesToCSV,
} from '@/services/lotteryGameManager';
import {
  conferirCarteira,
  modalidadesPendentes,
  momentoDoSorteio,
  proximoConcursoAberto,
  situacaoDoBilhete,
} from '@/services/lotteryConferencia';
import {
  buscarStatusDados,
  nomeDaFonte,
  tempoDesde,
  type StatusDados,
} from '@/services/lotteryTransparencia';

import { LotteryBall } from '@/components/lottery/LotteryBall';
import { LotteryHeatmap } from '@/components/lottery/LotteryHeatmap';
import { GameXRayModal } from '@/components/lottery/GameXRayModal';
import { BacktestPanel } from '@/components/lottery/BacktestPanel';
import { BolaoPanel } from '@/components/lottery/BolaoPanel';
import { ResponsibleGamingCard } from '@/components/lottery/ResponsibleGamingCard';
import { ExtraFieldPicker } from '@/components/lottery/ExtraFieldPicker';
import { InstallAppCard } from '@/components/lottery/InstallAppCard';
import { ComoUsarPanel } from '@/components/lottery/ComoUsarPanel';
import { PowerballLogo } from '@/components/lottery/PowerballLogo';
import { ehPrimeiraVisita, marcarVisita } from '@/lib/primeiraVisita';
import { useAuth } from '@/contexts/AuthContext';
import { AVISO_CURTO, TERMOS_VERSAO } from '@/constants/termosDeUso';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import {
  Sparkles,
  Layers,
  BarChart3,
  BookmarkCheck,
  CheckCircle2,
  RefreshCw,
  Share2,
  Download,
  Trash2,
  Calculator,
  ShieldCheck,
  Info,
  Sliders,
  DollarSign,
  TrendingUp,
  Award,
  Calendar,
  FlaskConical,
  Users,
  LifeBuoy,
  LogOut,
  AlertTriangle,
  Clock,
  Pencil,
  Scale,
  ListOrdered,
} from 'lucide-react';

type FiltroCarteira = 'todos' | 'aguardando' | 'conferidos' | 'premiados';

const HISTORICO_VALIDADE_MS = 10 * 60 * 1000;

function formatarReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function LotteryPalpites() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedLottery, setSelectedLottery] = useState<LotteryType>('lotofacil');
  const [activeTab, setActiveTab] = useState<LotteryTab>(() =>
    ehPrimeiraVisita() ? 'como-usar' : 'gerador',
  );

  // Dados e Concursos
  const [loadingDraw, setLoadingDraw] = useState(false);
  const [latestDraw, setLatestDraw] = useState<LotteryDraw | null>(null);
  const [draws, setDraws] = useState<LotteryDraw[]>([]);
  const [stats, setStats] = useState<LotteryStats | null>(null);

  // Gerador State
  const [strategy, setStrategy] = useState<GeneratorStrategy>('ai_smart');
  const [numbersCount, setNumbersCount] = useState<number>(15);
  const [gamesCount, setGamesCount] = useState<number>(5);
  const [fixedNumbers, setFixedNumbers] = useState<number[]>([]);
  const [excludedNumbers, setExcludedNumbers] = useState<number[]>([]);
  const [generatedGames, setGeneratedGames] = useState<GeneratedGame[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [extraSelection, setExtraSelection] = useState<LotteryExtraSelection | undefined>();

  // Fechamentos State
  const [selectedFechamento, setSelectedFechamento] = useState<FechamentoPlan | null>(null);
  const [fechamentoPool, setFechamentoPool] = useState<number[]>([]);
  const [fechamentoGames, setFechamentoGames] = useState<GeneratedGame[]>([]);

  // Carteira de Jogos Salvos
  const [savedGames, setSavedGames] = useState<UserSavedGame[]>(() => getSavedGames());
  const [filtroCarteira, setFiltroCarteira] = useState<FiltroCarteira>('todos');
  const [editandoAlvo, setEditandoAlvo] = useState<{ id: string; valor: string } | null>(null);

  // De onde veio o resultado exibido e o estado das fontes no servidor
  const [fonteDados, setFonteDados] = useState<{ source: LotterySource; em: string } | null>(null);
  const [statusDados, setStatusDados] = useState<StatusDados | null>(null);

  const historicosRef = useRef<Partial<Record<LotteryType, { em: number; draws: LotteryDraw[] }>>>({});
  const conferindoRef = useRef(false);
  const conferirDeNovoRef = useRef(false);

  // Modal Raio-X
  const [inspectGame, setInspectGame] = useState<GeneratedGame | null>(null);

  const config = LOTTERY_CONFIGS[selectedLottery];

  // Carrega concursos e calcula estatísticas ao alternar loteria
  useEffect(() => {
    loadLotteryData(selectedLottery);
    setNumbersCount(LOTTERY_CONFIGS[selectedLottery].minSelection);
    setFixedNumbers([]);
    setExcludedNumbers([]);
    setGeneratedGames([]);
    setFechamentoGames([]);
    setFechamentoPool([]);
    setExtraSelection(undefined);
    setStrategy('ai_smart');

    const fechamentos = getFechamentosByLottery(selectedLottery);
    if (fechamentos.length > 0) {
      setSelectedFechamento(fechamentos[0]);
    }
  }, [selectedLottery]);

  // Recarrega jogos salvos
  useEffect(() => {
    setSavedGames(getSavedGames());
    marcarVisita();

    // Quem ativou os avisos é notificado dos concursos que saíram enquanto o
    // app estava fechado.
    void verificarNovosResultados();

    // Com login e backend configurados, a carteira acompanha o usuário entre
    // os aparelhos. Sem isso o site segue funcionando só com o armazenamento local.
    if (isCloudSyncAvailable()) {
      void syncWallet().then((resultado) => {
        if (resultado.status === 'sincronizado' && resultado.games) {
          setSavedGames(resultado.games);
          void conferirAgora();
        }
      });
    }

    void buscarStatusDados().then(setStatusDados);
  }, []);

  // Cada histórico novo pode completar a conferência de bilhetes pendentes.
  useEffect(() => {
    if (draws.length > 0) void conferirAgora();
  }, [draws]);

  const loadLotteryData = async (lottery: LotteryType) => {
    setLoadingDraw(true);
    try {
      const history = await getLotteryHistory(lottery);
      historicosRef.current[lottery] = { em: Date.now(), draws: history.draws };
      setDraws(history.draws);
      setLatestDraw(history.draws[0] ?? null);
      setFonteDados({ source: history.source, em: history.lastUpdated });
      setStats(calculateLotteryStats(lottery, history.draws));
    } catch {
      toast.error('Erro ao conectar com dados da Caixa');
    } finally {
      setLoadingDraw(false);
    }
  };

  const avisarConferidos = (conferidos: UserSavedGame[]) => {
    if (conferidos.length === 0) return;

    const premiados = conferidos.filter((game) => game.checkResult?.isWinner);
    if (premiados.length > 0) {
      premiados.slice(0, 3).forEach((game) => {
        toast.success(`Bilhete premiado! ${descreverConferencia(game)}.`, { duration: 10000 });
      });
      if (premiados.length > 3) {
        toast.success(`Mais ${premiados.length - 3} bilhetes premiados na Carteira.`);
      }
    } else {
      const melhor = conferidos.reduce((a, b) =>
        (b.checkResult?.hits ?? 0) > (a.checkResult?.hits ?? 0) ? b : a,
      );
      toast.info(
        `${conferidos.length} bilhete(s) conferido(s). Nenhum premiado; melhor resultado — ${descreverConferencia(melhor)}.`,
      );
    }

    void notificarConferencia(conferidos);
  };

  /**
   * Confere os bilhetes cujo sorteio já saiu, em todas as modalidades da
   * Carteira. Busca o histórico só das modalidades com bilhete pendente.
   */
  const conferirAgora = async () => {
    if (conferindoRef.current) {
      conferirDeNovoRef.current = true;
      return;
    }
    conferindoRef.current = true;

    try {
      const carteira = getSavedGames();
      const pendentes = modalidadesPendentes(carteira);
      if (pendentes.length === 0) return;

      const historicos: Partial<Record<LotteryType, LotteryDraw[]>> = {};
      for (const lottery of pendentes) {
        const guardado = historicosRef.current[lottery];
        if (guardado && Date.now() - guardado.em < HISTORICO_VALIDADE_MS) {
          historicos[lottery] = guardado.draws;
          continue;
        }
        const history = await getLotteryHistory(lottery);
        historicosRef.current[lottery] = { em: Date.now(), draws: history.draws };
        historicos[lottery] = history.draws;
      }

      const resultado = await conferirCarteira(carteira, historicos);
      if (!resultado.alterou) return;

      // A Carteira pode ter mudado durante as buscas: aplica só o concurso e
      // a conferência sobre a versão atual.
      const porId = new Map(resultado.carteira.map((game) => [game.id, game]));
      const atual = getSavedGames().map((game) => {
        const conferido = porId.get(game.id);
        if (!conferido) return game;
        if (game.concursoAlvo && game.concursoAlvo !== conferido.concursoAlvo) return game;
        return {
          ...game,
          concursoAlvo: conferido.concursoAlvo,
          checkResult: conferido.checkResult,
        };
      });

      replaceSavedGames(atual);
      setSavedGames(atual);
      void pushWallet(atual);
      avisarConferidos(resultado.recemConferidos);
    } catch {
      // A conferência volta a rodar no próximo carregamento de resultados.
    } finally {
      conferindoRef.current = false;
      if (conferirDeNovoRef.current) {
        conferirDeNovoRef.current = false;
        void conferirAgora();
      }
    }
  };

  /** Marca os bilhetes com o concurso que ainda está aberto para apostas. */
  const comConcursoAlvo = (games: GeneratedGame[]): GeneratedGame[] => {
    const alvo = proximoConcursoAberto(draws);
    if (!alvo) return games;
    return games.map((game) => ({ ...game, concursoAlvo: game.concursoAlvo ?? alvo }));
  };

  // Manipulação de dezenas fixas e excluídas no seletor
  const handleToggleBallSelection = (num: number) => {
    if (activeTab === 'fechamentos' && selectedFechamento) {
      // Modo Fechamento: seleciona dezenas para o pool
      if (fechamentoPool.includes(num)) {
        setFechamentoPool(fechamentoPool.filter((n) => n !== num));
      } else {
        if (fechamentoPool.length >= selectedFechamento.totalSelectedNumbers) {
          toast.warning(`Limite de ${selectedFechamento.totalSelectedNumbers} dezenas atingido`);
          return;
        }
        setFechamentoPool([...fechamentoPool, num].sort((a, b) => a - b));
      }
      return;
    }

    // Modo Gerador: clique alterna entre Livre -> Fixa (Verde) -> Excluída (Vermelho) -> Livre
    if (fixedNumbers.includes(num)) {
      setFixedNumbers(fixedNumbers.filter((n) => n !== num));
      setExcludedNumbers([...excludedNumbers, num]);
    } else if (excludedNumbers.includes(num)) {
      setExcludedNumbers(excludedNumbers.filter((n) => n !== num));
    } else {
      if (fixedNumbers.length >= numbersCount - 1) {
        toast.warning(`Você pode fixar no máximo ${numbersCount - 1} dezenas`);
        return;
      }
      setFixedNumbers([...fixedNumbers, num]);
    }
  };

  // Dispara geração inteligente de palpites
  const handleGenerate = () => {
    if (!stats) return;
    setIsGenerating(true);

    setTimeout(() => {
      try {
        const results = generateLotteryGames(
          selectedLottery,
          {
            strategy,
            numbersCount,
            fixedNumbers,
            excludedNumbers,
            gamesCount,
            extraSelection,
          },
          stats
        );
        const comAlvo = comConcursoAlvo(results);
        setGeneratedGames(comAlvo);
        guardarNaCarteira(comAlvo);
        toast.success(
          `${results.length} jogos gerados e guardados na Carteira. Você encontra eles na aba Carteira.`,
        );
      } catch (err: any) {
        toast.error(err.message || 'Erro ao gerar palpites');
      } finally {
        setIsGenerating(false);
      }
    }, 200);
  };

  // Dispara geração de Fechamento Matemático
  const handleGenerateFechamento = () => {
    if (!selectedFechamento || !stats) return;

    if (fechamentoPool.length !== selectedFechamento.totalSelectedNumbers) {
      toast.error(
        `Selecione exatamente ${selectedFechamento.totalSelectedNumbers} dezenas (você escolheu ${fechamentoPool.length}).`
      );
      return;
    }

    try {
      const tickets = comConcursoAlvo(
        executeFechamento(selectedFechamento, fechamentoPool, stats),
      );
      setFechamentoGames(tickets);
      guardarNaCarteira(tickets);
      toast.success(
        `Fechamento de ${tickets.length} bilhetes guardado na Carteira. Garantia de ${selectedFechamento.guaranteedHit} pontos.`,
      );
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar fechamento');
    }
  };

  // Preenchimento automático com as dezenas mais quentes para o fechamento
  const handleAutoFillFechamento = () => {
    if (!selectedFechamento || !stats) return;
    const sorted = Object.entries(stats.frequencias)
      .sort((a, b) => b[1] - a[1])
      .map(([n]) => Number(n))
      .slice(0, selectedFechamento.totalSelectedNumbers)
      .sort((a, b) => a - b);

    setFechamentoPool(sorted);
    toast.success(`Selecionadas as ${sorted.length} dezenas mais quentes do histórico!`);
  };

  const guardarNaCarteira = (games: GeneratedGame[]) => {
    if (games.length === 0) return;
    games.forEach((game) => saveGame(game));
    const carteira = getSavedGames();
    setSavedGames(carteira);
    void pushWallet(carteira);
  };

  // Salvar jogo na carteira
  const handleSaveGame = (game: GeneratedGame) => {
    guardarNaCarteira([game]);
    toast.success('Jogo salvo na Carteira.');
  };

  const handleRemoveSavedGame = (id: string) => {
    removeSavedGame(id);
    const carteira = getSavedGames();
    setSavedGames(carteira);
    void pushWallet(carteira);
    toast.info('Jogo removido da carteira.');
  };

  const handleToggleBet = (id: string) => {
    toggleBetStatus(id);
    const carteira = getSavedGames();
    setSavedGames(carteira);
    void pushWallet(carteira);
  };

  const handleSalvarConcursoAlvo = () => {
    if (!editandoAlvo) return;
    const concurso = Number(editandoAlvo.valor);
    if (!Number.isInteger(concurso) || concurso <= 0) {
      toast.error('Informe o número do concurso.');
      return;
    }
    const carteira = setConcursoAlvo(editandoAlvo.id, concurso);
    setSavedGames(carteira);
    setEditandoAlvo(null);
    void pushWallet(carteira);
    void conferirAgora();
    toast.success(`Bilhete vinculado ao concurso ${concurso}.`);
  };

  // Compartilhar WhatsApp — também grava na Carteira, senão o envio some ao sair.
  const handleShareWhatsApp = (games: GeneratedGame[]) => {
    guardarNaCarteira(games);
    const text = formatGamesForWhatsApp(games, `${config.fullName} - ${games.length} Jogos`);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    toast.success(`${games.length} jogos guardados na Carteira e enviados no WhatsApp.`);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Seletor de Loteria Oficial */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <PowerballLogo altura={64} className="hidden sm:block shrink-0" />

          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight uppercase text-powerball-navy dark:text-white">
              Loterias Caixa • Powerball
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <p className="text-lg md:text-xl font-bold text-powerball-gold-dark dark:text-powerball-gold">
                Palpites Inteligentes
              </p>
              {/* Nada de selo "oficial": o site não tem vínculo com a Caixa e o
                  termo de uso diz isso em letras grandes. */}
              <Badge variant="outline" className="text-[11px] font-semibold text-muted-foreground">
                Site independente
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Motor combinatório, estatísticas oficiais, inteligência analítica e fechamentos matemáticos.
            </p>
          </div>
        </div>

        {/* Alternador de Loteria Caixa */}
        <div className="flex flex-wrap items-center gap-2">
          {LOTTERY_ORDER.map((tipo) => {
            const opcao = LOTTERY_CONFIGS[tipo];
            const ativo = selectedLottery === tipo;

            return (
              <Button
                key={tipo}
                type="button"
                variant={ativo ? 'default' : 'outline'}
                onClick={() => setSelectedLottery(tipo)}
                style={
                  ativo
                    ? { backgroundColor: opcao.color, borderColor: opcao.color }
                    : { color: opcao.color, borderColor: `${opcao.color}40` }
                }
                className={ativo ? 'text-white font-bold' : 'font-semibold hover:bg-slate-50'}
              >
                {opcao.name}
              </Button>
            );
          })}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => loadLotteryData(selectedLottery)}
            disabled={loadingDraw}
            title="Atualizar dados da Caixa"
          >
            <RefreshCw className={`h-4 w-4 ${loadingDraw ? 'animate-spin' : ''}`} />
          </Button>

          <Button asChild variant="ghost" size="sm" className="text-xs font-semibold">
            <Link to={`/resultados/${config.slug}`} title="Todos os concursos com premiação">
              <ListOrdered className="h-4 w-4 mr-1" />
              Resultados
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-xs font-semibold">
            <Link to="/transparencia" title="Placar real das estratégias e status das fontes">
              <Scale className="h-4 w-4 mr-1" />
              Transparência
            </Link>
          </Button>

          {user && (
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                {user.name.split(' ')[0]}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Sair da conta"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {(() => {
        const status = statusDados?.modalidades.find((item) => item.lottery === selectedLottery);
        if (!status?.alerta) return null;
        return (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              <strong>Os dados da {config.name} podem estar atrasados.</strong> {status.alerta}{' '}
              Confira o resultado também no site da Caixa.{' '}
              <Link to="/transparencia" className="font-semibold underline">
                Ver status das fontes
              </Link>
            </span>
          </div>
        );
      })()}

      {/* Card do Último Concurso Oficial da Caixa */}
      {latestDraw && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">
                    Último Sorteio Oficial
                  </span>
                  <Badge className="bg-slate-700 text-slate-200 text-[11px]">
                    Concurso nº {latestDraw.concurso}
                  </Badge>
                  {latestDraw.acumulou && (
                    <Badge className="bg-amber-500 text-amber-950 font-bold">ACUMULOU!</Badge>
                  )}
                </div>
                <div className="text-2xl font-extrabold mt-1">
                  {latestDraw.estimativaProximoPremio
                    ? `Próximo prêmio: ${latestDraw.estimativaProximoPremio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                    : 'Premiação oficial da Caixa'}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Realizado em {latestDraw.data} • {latestDraw.local || 'Espaço da Sorte, SP'}
                </p>
                {fonteDados && (
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Fonte: {nomeDaFonte(fonteDados.source)} • verificado em{' '}
                    {formatarDataHora(fonteDados.em)}
                    {latestDraw.dataProximoConcurso && ` • próximo sorteio ${latestDraw.dataProximoConcurso}`}
                  </p>
                )}
              </div>

              {/* Dezenas Sorteadas */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 justify-start md:justify-end">
                  {config.hasSecondDraw && (
                    <span className="text-[11px] uppercase tracking-wide text-slate-400 mr-1">
                      1º sorteio
                    </span>
                  )}
                  {latestDraw.dezenas.map((n) => (
                    <span
                      key={n}
                      className="w-8 h-8 rounded-full bg-white text-slate-900 font-extrabold text-sm flex items-center justify-center shadow-md"
                    >
                      {String(n).padStart(2, '0')}
                    </span>
                  ))}
                </div>

                {latestDraw.dezenasSegundoSorteio?.length ? (
                  <div className="flex flex-wrap items-center gap-1.5 justify-start md:justify-end">
                    <span className="text-[11px] uppercase tracking-wide text-slate-400 mr-1">
                      2º sorteio
                    </span>
                    {latestDraw.dezenasSegundoSorteio.map((n) => (
                      <span
                        key={`s2-${n}`}
                        className="w-8 h-8 rounded-full bg-slate-200 text-slate-900 font-extrabold text-sm flex items-center justify-center shadow-md"
                      >
                        {String(n).padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                ) : null}

                {(latestDraw.mesSorte || latestDraw.trevos?.length) && (
                  <div className="flex items-center gap-1.5 justify-start md:justify-end">
                    <span className="text-[11px] uppercase tracking-wide text-slate-400">
                      {latestDraw.mesSorte ? 'Mês da Sorte' : 'Trevos'}
                    </span>
                    <Badge className="bg-amber-400 text-amber-950 font-bold">
                      {latestDraw.mesSorte ?? latestDraw.trevos?.join(' e ')}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {latestDraw.premiacoes?.length ? (
              <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-xs">
                  <thead className="text-slate-400 uppercase">
                    <tr>
                      <th className="text-left font-semibold px-3 py-2">Faixa deste concurso</th>
                      <th className="text-right font-semibold px-3 py-2">Ganhadores</th>
                      <th className="text-right font-semibold px-3 py-2">Prêmio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestDraw.premiacoes.map((faixa, idx) => (
                      <tr key={`${faixa.faixa}-${idx}`} className="border-t border-white/10">
                        <td className="px-3 py-1.5">{faixa.descricao}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {faixa.ganhadores.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
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
          </CardContent>
        </Card>
      )}

      <InstallAppCard />

      {/* Navegação por Abas Principais */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as LotteryTab)}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 w-full h-auto p-1 bg-slate-100 dark:bg-slate-900">
          <TabsTrigger
            value="como-usar"
            className="py-2.5 font-semibold text-xs md:text-sm data-[state=active]:bg-powerball-gold data-[state=active]:text-powerball-navy"
          >
            <LifeBuoy className="h-4 w-4 mr-1.5 text-rose-600" />
            Como Usar
          </TabsTrigger>
          <TabsTrigger value="gerador" className="py-2.5 font-semibold text-xs md:text-sm">
            <Sparkles className="h-4 w-4 mr-1.5 text-powerball-navy" />
            Gerador
          </TabsTrigger>
          <TabsTrigger value="fechamentos" className="py-2.5 font-semibold text-xs md:text-sm">
            <Layers className="h-4 w-4 mr-1.5 text-emerald-600" />
            Fechamentos
          </TabsTrigger>
          <TabsTrigger value="estatisticas" className="py-2.5 font-semibold text-xs md:text-sm">
            <BarChart3 className="h-4 w-4 mr-1.5 text-blue-600" />
            Estatísticas
          </TabsTrigger>
          <TabsTrigger value="backtest" className="py-2.5 font-semibold text-xs md:text-sm">
            <FlaskConical className="h-4 w-4 mr-1.5 text-powerball-gold-dark" />
            Prova Real
          </TabsTrigger>
          <TabsTrigger value="bolao" className="py-2.5 font-semibold text-xs md:text-sm">
            <Users className="h-4 w-4 mr-1.5 text-cyan-600" />
            Bolão
          </TabsTrigger>
          <TabsTrigger value="carteira" className="py-2.5 font-semibold text-xs md:text-sm">
            <BookmarkCheck className="h-4 w-4 mr-1.5 text-amber-600" />
            Carteira ({savedGames.length})
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* ABA 0: GUIA DE USO                                             */}
        {/* ============================================================== */}
        <TabsContent value="como-usar">
          <ComoUsarPanel lottery={selectedLottery} onIrPara={setActiveTab} />
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 1: GERADOR INTELIGENTE MULTIESTRATÉGIA                     */}
        {/* ============================================================== */}
        <TabsContent value="gerador" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Painel de Configuração do Gerador */}
            <Card className="lg:col-span-1 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  Estratégia & Filtros
                </CardTitle>
                <CardDescription>
                  Configure a inteligência aplicada na geração dos bilhetes.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 text-sm">
                {/* Estratégia */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Estratégia Analítica
                  </label>
                  <Select value={strategy} onValueChange={(v) => setStrategy(v as GeneratorStrategy)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a estratégia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ai_smart">🧠 Motor Heurístico IA (Melhor Score)</SelectItem>
                      <SelectItem value="balanced">⚖️ Equilibrado (Quentes + Atrasadas)</SelectItem>
                      <SelectItem value="hot">🔥 Dezenas Quentes (Mais Frequentes)</SelectItem>
                      <SelectItem value="cold">❄️ Dezenas Atrasadas (Lei do Retorno)</SelectItem>
                      <SelectItem value="affinity">🔗 Afinidade Histórica (Pares Casados)</SelectItem>
                      {config.frameNumbers && (
                        <SelectItem value="frame_center">🖼️ Moldura e Miolo (Padrão 10/5)</SelectItem>
                      )}
                      <SelectItem value="parity_sum">📐 Paridade & Soma na Curva</SelectItem>
                      <SelectItem value="anti_popular">🛡️ Anti-Popular (Evita Divisão)</SelectItem>
                      <SelectItem value="random">🎲 Surpresinha Pura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ExtraFieldPicker
                  lottery={selectedLottery}
                  value={extraSelection}
                  onChange={setExtraSelection}
                  stats={stats}
                />

                {/* Quantidade de Dezenas por Jogo */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Dezenas no Bilhete
                    </label>
                    <Select
                      value={String(numbersCount)}
                      onValueChange={(v) => setNumbersCount(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(
                          { length: config.maxSelection - config.minSelection + 1 },
                          (_, i) => config.minSelection + i
                        ).map((qty) => (
                          <SelectItem key={qty} value={String(qty)}>
                            {qty} números (R$ {(config.priceTable[qty] || 0).toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Qtd. de Jogos
                    </label>
                    <Select
                      value={String(gamesCount)}
                      onValueChange={(v) => setGamesCount(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 3, 5, 10, 15, 20].map((qty) => (
                          <SelectItem key={qty} value={String(qty)}>
                            {qty} {qty === 1 ? 'jogo' : 'jogos'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custo Estimado */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Investimento Estimado:</span>
                  <span className="font-bold text-base text-emerald-600">
                    R$ {((config.priceTable[numbersCount] || 0) * gamesCount).toFixed(2)}
                  </span>
                </div>

                {/* Info sobre fixar/excluir */}
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900 flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Clique nas dezenas do volante ao lado para <b>Fixar</b> (verde) ou <b>Excluir</b> (vermelho).
                  </span>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !stats}
                  className="w-full bg-powerball-gold hover:bg-powerball-gold-dark text-powerball-navy hover:text-white font-bold py-6 text-base shadow-md"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  {isGenerating ? 'Calculando Probabilidades...' : 'Gerar Palpites Inteligentes'}
                </Button>
              </CardContent>
            </Card>

            {/* Volante Interativo para Fixar/Excluir */}
            <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    Volante de Dezenas ({selectedLottery === 'lotofacil' ? '1 a 25' : '1 a 60'})
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      Fixas: {fixedNumbers.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                      Excluídas: {excludedNumbers.length}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div
                  className="grid gap-2 justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800"
                  style={{
                    gridTemplateColumns: `repeat(${config.colsGrid}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: config.totalNumbers }, (_, i) => {
                    const num = i + 1;
                    const isFixed = fixedNumbers.includes(num);
                    const isExcluded = excludedNumbers.includes(num);

                    let ballClass =
                      'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer transition-all border';
                    if (isFixed) {
                      ballClass += ' bg-emerald-600 text-white border-emerald-700 shadow-md scale-105';
                    } else if (isExcluded) {
                      ballClass += ' bg-rose-600 text-white border-rose-700 line-through opacity-80';
                    } else {
                      ballClass +=
                        ' bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-800 dark:text-slate-200';
                    }

                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleToggleBallSelection(num)}
                        className={ballClass}
                        title={`Dezena ${num}`}
                      >
                        {String(num).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFixedNumbers([]);
                      setExcludedNumbers([]);
                    }}
                    className="text-xs text-muted-foreground"
                  >
                    Limpar Seleções
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resultados dos Jogos Gerados */}
          {generatedGames.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    Palpites Otimizados ({generatedGames.length} jogos)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Classificados pelo algoritmo de qualidade estatística (Score 0 a 100).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShareWhatsApp(generatedGames)}
                    className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    <Share2 className="h-3.5 w-3.5 mr-1" />
                    Enviar WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      guardarNaCarteira(generatedGames);
                      toast.success(`${generatedGames.length} jogos na Carteira.`);
                      setActiveTab('carteira');
                    }}
                    className="text-xs"
                  >
                    <BookmarkCheck className="h-3.5 w-3.5 mr-1" />
                    Ver na Carteira
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportGamesToCSV(generatedGames, `${selectedLottery}-palpites.csv`)}
                    className="text-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Exportar Excel / CSV
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedGames.map((game, index) => (
                  <Card
                    key={game.id}
                    className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                            Jogo #{index + 1}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {game.strategyLabel}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                              game.score >= 85
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            Score: {game.score} pts
                          </span>
                        </div>
                      </div>

                      {/* Dezenas do Jogo */}
                      <div className="flex flex-wrap items-center gap-1.5 py-1">
                        {game.numbers.map((n) => (
                          <LotteryBall
                            key={n}
                            number={n}
                            lottery={selectedLottery}
                            selected
                            size="sm"
                          />
                        ))}
                      </div>

                      {/* Resumo Rápido & Ações */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="text-muted-foreground flex items-center gap-3">
                          <span>
                            {game.analysis.evenCount}P / {game.analysis.oddCount}I
                          </span>
                          <span>Soma: {game.analysis.sum}</span>
                          <span className="font-semibold text-emerald-600">
                            R$ {game.cost.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInspectGame(game)}
                            className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                            Raio-X
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveGame(game)}
                            className="h-8 text-xs"
                          >
                            Salvar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 2: FECHAMENTOS MATEMÁTICOS (DESDOBRAMENTOS COM GARANTIA)    */}
        {/* ============================================================== */}
        <TabsContent value="fechamentos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Escolha do Plano de Fechamento */}
            <Card className="lg:col-span-1 border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-emerald-600" />
                  Matrizes de Fechamento
                </CardTitle>
                <CardDescription>
                  Garantias matemáticas com custo reduzido (Wheeling systems).
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {getFechamentosByLottery(selectedLottery).map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => {
                      setSelectedFechamento(plan);
                      setFechamentoPool([]);
                      setFechamentoGames([]);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedFechamento?.id === plan.id
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{plan.name}</span>
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        -{plan.savingsPercent}% Custo
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {plan.description}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                      <span>{plan.ticketsCount} bilhetes</span>
                      <span className="font-bold text-emerald-700">
                        Total: R$ {plan.totalCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Painel de Seleção das Dezenas do Fechamento */}
            {selectedFechamento && (
              <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        Selecione as {selectedFechamento.totalSelectedNumbers} Dezenas
                      </CardTitle>
                      <CardDescription>
                        {fechamentoPool.length} de {selectedFechamento.totalSelectedNumbers}{' '}
                        dezenas selecionadas
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAutoFillFechamento}
                        className="text-xs text-powerball-navy border-powerball-navy/30 hover:bg-powerball-navy/5"
                      >
                        <TrendingUp className="h-3.5 w-3.5 mr-1" />
                        Mais Quentes Automático
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFechamentoPool([])}
                        className="text-xs text-muted-foreground"
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Grid de Bolas para Fechamento */}
                  <div
                    className="grid gap-2 justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800"
                    style={{
                      gridTemplateColumns: `repeat(${config.colsGrid}, minmax(0, 1fr))`,
                    }}
                  >
                    {Array.from({ length: config.totalNumbers }, (_, i) => {
                      const num = i + 1;
                      const isSelected = fechamentoPool.includes(num);

                      return (
                        <LotteryBall
                          key={num}
                          number={num}
                          lottery={selectedLottery}
                          selected={isSelected}
                          onClick={() => handleToggleBallSelection(num)}
                          size="md"
                        />
                      );
                    })}
                  </div>

                  {/* Informações Matemáticas da Garantia */}
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-sm">Garantia Condicional Matemática</p>
                      <p>
                        Se {selectedFechamento.conditionHit} das dezenas sorteadas estiverem entre
                        as suas {selectedFechamento.totalSelectedNumbers} dezenas escolhidas, é{' '}
                        <b>100% garantido</b> que você terá pelo menos 1 bilhete com{' '}
                        {selectedFechamento.guaranteedHit} acertos premiados!
                      </p>
                      <p className="text-[11px] opacity-80 pt-1">
                        Desdobramento completo na Caixa custaria R${' '}
                        {selectedFechamento.comparisonCostFull.toFixed(2)}. Com o fechamento
                        otimizado você gasta apenas R$ {selectedFechamento.totalCost.toFixed(2)}.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateFechamento}
                    disabled={fechamentoPool.length !== selectedFechamento.totalSelectedNumbers}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 text-base shadow-md"
                  >
                    <Layers className="h-5 w-5 mr-2" />
                    Gerar {selectedFechamento.ticketsCount} Bilhetes do Fechamento
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Jogos do Fechamento Gerado */}
          {fechamentoGames.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    Bilhetes do Fechamento ({fechamentoGames.length} jogos)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Custo Total: R${' '}
                    {fechamentoGames.reduce((acc, g) => acc + g.cost, 0).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShareWhatsApp(fechamentoGames)}
                    className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    <Share2 className="h-3.5 w-3.5 mr-1" />
                    Enviar WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      guardarNaCarteira(fechamentoGames);
                      toast.success(`${fechamentoGames.length} bilhetes na Carteira.`);
                      setActiveTab('carteira');
                    }}
                    className="text-xs"
                  >
                    <BookmarkCheck className="h-3.5 w-3.5 mr-1" />
                    Ver na Carteira
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportGamesToCSV(fechamentoGames, `fechamento-${selectedLottery}.csv`)
                    }
                    className="text-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Exportar Excel
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {fechamentoGames.map((game, idx) => (
                  <Card key={game.id} className="border-slate-200 dark:border-slate-800">
                    <CardContent className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <span className="font-bold">Cartão #{idx + 1}</span>
                        <span className="text-muted-foreground">Score: {game.score}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {game.numbers.map((n) => (
                          <LotteryBall
                            key={n}
                            number={n}
                            lottery={selectedLottery}
                            selected
                            size="sm"
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                        <span>
                          {game.analysis.evenCount}P / {game.analysis.oddCount}I
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveGame(game)}
                          className="h-6 text-[11px] px-2"
                        >
                          Salvar Jogo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 3: MAPA DE CALOR & ESTATÍSTICAS                            */}
        {/* ============================================================== */}
        <TabsContent value="estatisticas" className="space-y-6">
          {stats ? (
            <div className="space-y-6">
              <LotteryHeatmap lottery={selectedLottery} stats={stats} />

              {/* Grid de Insights Estatísticos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-powerball-navy/10 dark:bg-powerball-navy/40 text-powerball-navy dark:text-powerball-gold">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Média de Pares / Ímpares</p>
                      <p className="text-lg font-bold">
                        {stats.mediaPares} Pares / {stats.mediaImpares} Ímpares
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Média da Soma dos Concursos</p>
                      <p className="text-lg font-bold">{stats.mediaSoma} pontos</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
                      <Layers className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {selectedLottery === 'lotofacil'
                          ? 'Repetição Média do Anterior'
                          : 'Pares Mais Frequentes'}
                      </p>
                      <p className="text-lg font-bold">
                        {selectedLottery === 'lotofacil'
                          ? `${stats.repeticoesDoAnteriorMedia || 9} dezenas`
                          : `${stats.paresFrequentes[0]?.pair.join(' e ') || '04 e 53'}`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Carregando dados históricos...
            </div>
          )}
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 4: PROVA REAL — BACKTEST DAS ESTRATÉGIAS                   */}
        {/* ============================================================== */}
        <TabsContent value="backtest" className="space-y-6">
          <BacktestPanel lottery={selectedLottery} draws={draws} />
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 5: BOLÃO — COTAS, RATEIO E PRESTAÇÃO DE CONTAS             */}
        {/* ============================================================== */}
        <TabsContent value="bolao" className="space-y-6">
          <BolaoPanel
            lottery={selectedLottery}
            candidatos={[
              ...generatedGames,
              ...fechamentoGames,
              ...savedGames.filter((game) => game.lottery === selectedLottery),
            ]}
            concursoAlvo={proximoConcursoAberto(draws) ?? undefined}
          />
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 6: MINHA CARTEIRA DE JOGOS & CONFERIDOR                    */}
        {/* ============================================================== */}
        <TabsContent value="carteira" className="space-y-6">
          <ResponsibleGamingCard lottery={selectedLottery} savedGames={savedGames} />

          {(() => {
            const premiados = savedGames.filter((game) => game.checkResult?.isWinner);
            if (premiados.length === 0) return null;
            const total = premiados.reduce((soma, game) => soma + (game.checkResult?.valorPremio ?? 0), 0);
            return (
              <Card className="border-amber-400 bg-amber-50/60 dark:bg-amber-950/20">
                <CardContent className="p-4 space-y-2">
                  <p className="font-bold flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-600" />
                    {premiados.length} bilhete(s) premiado(s) na sua Carteira
                    {total > 0 && ` — ${formatarReais(total)} em prêmios brutos`}
                  </p>
                  <ul className="text-xs space-y-0.5">
                    {premiados.slice(0, 8).map((game) => (
                      <li key={game.id}>{descreverConferencia(game)}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-muted-foreground">
                    Valores brutos informados pela Caixa, antes do imposto. Só vale o bilhete
                    registrado na lotérica ou no app oficial: confira sempre no site da Caixa.
                  </p>
                </CardContent>
              </Card>
            );
          })()}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                Minha Carteira de Bilhetes ({savedGames.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Cada bilhete é conferido contra o concurso para o qual foi feito, assim que o
                resultado sai.
              </p>
            </div>

            {savedGames.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={filtroCarteira} onValueChange={(valor) => setFiltroCarteira(valor as FiltroCarteira)}>
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="aguardando">Aguardando sorteio</SelectItem>
                    <SelectItem value="conferidos">Conferidos</SelectItem>
                    <SelectItem value="premiados">Premiados</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShareWhatsApp(savedGames)}
                  className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1" />
                  Compartilhar Carteira
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportGamesToCSV(savedGames, 'minha-carteira-jogos.csv')}
                  className="text-xs"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Exportar CSV
                </Button>
              </div>
            )}
          </div>

          {savedGames.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-300 dark:border-slate-800">
              <CardContent className="p-12 text-center space-y-3">
                <BookmarkCheck className="h-10 w-10 mx-auto text-slate-400" />
                <h4 className="font-semibold text-base">Sua carteira está vazia</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Gerar no Gerador ou nos Fechamentos já guarda os bilhetes aqui, e o envio pelo
                  WhatsApp também. A Carteira é o único lugar que resta depois que você sai e volta.
                </p>
                <Button onClick={() => setActiveTab('gerador')} size="sm">
                  Criar Primeiros Palpites
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedGames
                .filter((game) => {
                  const situacao = situacaoDoBilhete(game).tipo;
                  if (filtroCarteira === 'aguardando') return situacao !== 'conferido';
                  if (filtroCarteira === 'conferidos') return situacao === 'conferido';
                  if (filtroCarteira === 'premiados') return Boolean(game.checkResult?.isWinner);
                  return true;
                })
                .map((game, idx) => {
                const situacao = situacaoDoBilhete(game);
                const check = situacao.tipo === 'conferido' ? game.checkResult : undefined;
                const configBilhete = LOTTERY_CONFIGS[game.lottery];
                const historicoBilhete =
                  game.lottery === selectedLottery ? draws : historicosRef.current[game.lottery]?.draws;
                const ultimoBilhete = historicoBilhete?.[0];
                const dataPrevista =
                  situacao.tipo === 'aguardando' && ultimoBilhete?.concurso === situacao.concurso - 1
                    ? ultimoBilhete.dataProximoConcurso
                    : undefined;
                const sorteioPassou =
                  dataPrevista !== undefined && (momentoDoSorteio(dataPrevista) ?? Infinity) < Date.now();

                return (
                  <Card
                    key={game.id}
                    className={`border transition-all ${
                      check?.isWinner
                        ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">Aposta #{idx + 1}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase"
                            style={{ color: configBilhete.color, borderColor: `${configBilhete.color}60` }}
                          >
                            {configBilhete.name}
                          </Badge>
                          {game.isBet && (
                            <Badge className="bg-emerald-600 text-white text-[10px]">
                              Apostado na Lotérica
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSavedGame(game.id)}
                            className="h-7 w-7 text-rose-500 hover:text-rose-700"
                            title="Remover jogo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Dezenas */}
                      <div className="flex flex-wrap gap-1.5 py-1">
                        {game.numbers.map((n) => (
                          <LotteryBall
                            key={n}
                            number={n}
                            lottery={game.lottery}
                            selected
                            isHit={check?.hitNumbers.includes(n)}
                            size="sm"
                          />
                        ))}
                      </div>

                      {/* Concurso do bilhete e conferência */}
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                        {editandoAlvo?.id === game.id ? (
                          <form
                            className="flex items-center gap-2"
                            onSubmit={(evento) => {
                              evento.preventDefault();
                              handleSalvarConcursoAlvo();
                            }}
                          >
                            <span className="text-muted-foreground">Concurso</span>
                            <input
                              type="number"
                              min={1}
                              autoFocus
                              value={editandoAlvo.valor}
                              onChange={(evento) =>
                                setEditandoAlvo({ id: game.id, valor: evento.target.value })
                              }
                              className="w-24 h-7 rounded border border-slate-300 dark:border-slate-700 bg-transparent px-2"
                              aria-label="Número do concurso"
                            />
                            <Button type="submit" size="sm" className="h-7 text-xs">
                              Salvar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setEditandoAlvo(null)}
                            >
                              Cancelar
                            </Button>
                          </form>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">
                              {situacao.tipo === 'sem-concurso'
                                ? 'Concurso ainda não definido'
                                : `Para o concurso ${situacao.concurso}`}
                            </span>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-powerball-navy dark:text-powerball-gold hover:underline"
                              onClick={() =>
                                setEditandoAlvo({
                                  id: game.id,
                                  valor: String(game.concursoAlvo ?? proximoConcursoAberto(draws) ?? ''),
                                })
                              }
                            >
                              <Pencil className="h-3 w-3" />
                              Alterar
                            </button>
                          </div>
                        )}

                        {check ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">
                              Resultado{check.drawDate ? ` de ${check.drawDate}` : ''}:
                            </span>
                            <span
                              className={`font-bold ${
                                check.isWinner ? 'text-amber-600 text-sm' : 'text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {check.isWinner
                                ? `${check.prizeLabel ?? `${check.hits} acertos — premiado!`}${
                                    check.valorPremio ? ` ${formatarReais(check.valorPremio)}` : ''
                                  }`
                                : `${check.hits} acertos`}
                              {check.secondDrawHits !== undefined &&
                                ` (2º sorteio: ${check.secondDrawHits})`}
                            </span>
                          </div>
                        ) : situacao.tipo === 'aguardando' ? (
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {sorteioPassou
                              ? 'Sorteio realizado; aguardando a Caixa publicar o resultado.'
                              : `Aguardando o sorteio${dataPrevista ? ` de ${dataPrevista}` : ''}.`}
                          </p>
                        ) : null}
                      </div>

                      {/* Rodapé do Bilhete */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className="text-muted-foreground font-semibold">
                          R$ {game.cost.toFixed(2)}
                          <span className="font-normal"> • gerado em {formatarDataHora(game.createdAt)}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleBet(game.id)}
                            className="h-7 text-xs"
                          >
                            {game.isBet ? 'Desmarcar' : 'Marcar como Apostado'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInspectGame(game)}
                            className="h-7 text-xs text-blue-600"
                          >
                            Raio-X
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL RAIO-X DO JOGO */}
      <Dialog open={!!inspectGame} onOpenChange={() => setInspectGame(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Análise X-Ray da Aposta</DialogTitle>
            <DialogDescription>
              Inspeção detalhada de paridade, soma, dispersão e sequências.
            </DialogDescription>
          </DialogHeader>
          {inspectGame && (
            <GameXRayModal
              analysis={inspectGame.analysis}
              score={inspectGame.score}
              scoreLabel={inspectGame.scoreLabel}
              numbers={inspectGame.numbers}
            />
          )}
        </DialogContent>
      </Dialog>

      <footer className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
        <p className="text-[11px] leading-relaxed text-muted-foreground">{AVISO_CURTO}</p>
        <p className="text-[11px] text-muted-foreground">
          <button
            type="button"
            onClick={() => navigate('/termos')}
            className="font-semibold underline hover:text-foreground"
          >
            Termo de Uso e Isenção de Responsabilidade
          </button>
          {user && ` — versão ${TERMOS_VERSAO}, aceita por ${user.email}.`}
          {' • '}
          <Link to="/transparencia" className="font-semibold underline hover:text-foreground">
            Transparência
          </Link>
          {' • '}
          <Link to={`/resultados/${config.slug}`} className="font-semibold underline hover:text-foreground">
            Todos os resultados
          </Link>
        </p>
      </footer>
    </motion.div>
  );
}
