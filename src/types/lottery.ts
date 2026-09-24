export type LotteryType =
  | 'megasena'
  | 'lotofacil'
  | 'quina'
  | 'duplasena'
  | 'diadesorte'
  | 'maismilionaria';

/**
 * Campo extra exigido por algumas modalidades além das dezenas principais:
 * o Mês da Sorte (Dia de Sorte) e os Trevos da Sorte (+Milionária).
 */
export interface LotteryExtraField {
  key: 'mesSorte' | 'trevos';
  label: string;
  /** Rótulos exibidos no volante. Para trevos são os números 1..6. */
  options: string[];
  minSelection: number;
  maxSelection: number;
}

export interface LotteryPrizeTier {
  /** Acertos entre as dezenas principais. */
  hits: number;
  label: string;
  /** Acertos de trevo exigidos na faixa (+Milionária). */
  trevos?: number;
}

export interface LotteryConfig {
  type: LotteryType;
  name: string;
  fullName: string;
  /** Slug usado nas rotas públicas de resultado (SEO). */
  slug: string;
  color: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  totalNumbers: number; // 60 para Mega, 25 para Lotofácil
  minSelection: number; // 6 para Mega, 15 para Lotofácil
  maxSelection: number; // 15 para Mega, 20 para Lotofácil
  drawDays: string[];
  /** Preço oficial da aposta mínima, base do cálculo combinatório. */
  basePrice: number;
  priceTable: Record<number, number>; // dezenas -> preço oficial em R$
  colsGrid: number; // 10 para Mega (6x10), 5 para Lotofácil (5x5)
  frameNumbers?: number[]; // Moldura (Lotofácil)
  centerNumbers?: number[]; // Miolo (Lotofácil)
  primeNumbers: number[];
  idealSumRange: [number, number];
  idealEvenRange: [number, number];
  /** Faixas de premiação oficiais, da maior para a menor. */
  prizeTiers: LotteryPrizeTier[];
  /** Chance de 1 em N de acertar a faixa principal com a aposta mínima. */
  mainPrizeOdds: number;
  /** Dupla Sena sorteia duas vezes por concurso, valendo o melhor resultado. */
  hasSecondDraw?: boolean;
  extraField?: LotteryExtraField;
}

export interface LotteryDraw {
  loteria: LotteryType;
  concurso: number;
  data: string;
  local?: string;
  dezenas: number[];
  dezenasOrdemSorteio?: number[];
  /** 2º sorteio da Dupla Sena. */
  dezenasSegundoSorteio?: number[];
  /** Mês da Sorte (Dia de Sorte). */
  mesSorte?: string;
  /** Trevos da Sorte (+Milionária). */
  trevos?: number[];
  acumulou: boolean;
  valorAcumuladoProximoConcurso?: number;
  dataProximoConcurso?: string;
  premiacoes?: Array<{
    descricao: string;
    faixa: number;
    ganhadores: number;
    valorPremio: number;
  }>;
  arrecadacaoTotal?: number;
  estimativaProximoPremio?: number;
}

export interface LotteryStats {
  totalConcursos: number;
  ultimoConcurso: LotteryDraw;
  frequencias: Record<number, number>; // dezena -> contagem
  atrasos: Record<number, number>; // dezena -> concursos sem sair
  paresFrequentes: Array<{ pair: [number, number]; count: number }>;
  mediaPares: number;
  mediaImpares: number;
  mediaSoma: number;
  repeticoesDoAnteriorMedia?: number;
  /** Frequência do campo extra (Mês da Sorte / Trevos). */
  extraFrequencias?: Record<string, number>;
}

/** Abas da página de palpites. */
export type LotteryTab =
  | 'como-usar'
  | 'gerador'
  | 'fechamentos'
  | 'estatisticas'
  | 'backtest'
  | 'bolao'
  | 'carteira';

export type GeneratorStrategy =
  | 'balanced' // Balanceado (Frequentes + Atrasadas + Medianas)
  | 'hot' // Dezenas Quentes (Mais frequentes)
  | 'cold' // Dezenas Frias (Mais atrasadas / Lei do Retorno)
  | 'affinity' // Afinidade histórica (Pares que mais saem juntos)
  | 'frame_center' // Moldura e Miolo (Padrão ouro 10/5 ou 9/6 para Lotofácil)
  | 'parity_sum' // Paridade ideal e soma ótima na curva normal
  | 'anti_popular' // Baixa sobreposição e anti-datas (evita divisão de prêmio)
  | 'ai_smart' // Motor Heurístico Multicritério com pontuação máxima
  | 'random'; // Aleatório Puro com restrição de validade

export interface GenerationFilters {
  strategy: GeneratorStrategy;
  numbersCount: number;
  fixedNumbers: number[];
  excludedNumbers: number[];
  gamesCount: number;
  minEven?: number;
  maxEven?: number;
  minSum?: number;
  maxSum?: number;
  framePreference?: 'balanced' | 'strict' | 'any'; // para Lotofácil
  maxConsecutive?: number;
  /** Mês da Sorte / Trevos fixados pelo usuário; se ausente, o gerador escolhe. */
  extraSelection?: LotteryExtraSelection;
}

/** Escolhas extras do volante (Mês da Sorte / Trevos da Sorte). */
export interface LotteryExtraSelection {
  mesSorte?: string;
  trevos?: number[];
}

export interface GeneratedGame {
  id: string;
  lottery: LotteryType;
  numbers: number[];
  extra?: LotteryExtraSelection;
  strategy: GeneratorStrategy;
  strategyLabel: string;
  createdAt: string;
  cost: number;
  score: number; // 0 - 100
  scoreLabel: 'Excelente' | 'Muito Bom' | 'Bom' | 'Regular';
  analysis: GameAnalysis;
  pinned?: boolean;
  isBet?: boolean; // Se o usuário marcou como apostado
  name?: string;
  /** Concurso para o qual o bilhete foi feito; a conferência usa só ele. */
  concursoAlvo?: number;
}

export interface GameAnalysis {
  evenCount: number;
  oddCount: number;
  sum: number;
  sumStatus: 'ideal' | 'moderada' | 'extrema';
  primeCount: number;
  consecutivePairs: number;
  maxConsecutiveRun: number;
  frameHits?: number; // Para Lotofácil
  centerHits?: number; // Para Lotofácil
  previousDrawRepeats?: number;
  scoreBreakdown: {
    parityScore: number;
    sumScore: number;
    spreadScore: number;
    consecutivePenalty: number;
    frequencyScore: number;
    frameScore?: number;
  };
  recommendations: string[];
}

export interface FechamentoPlan {
  id: string;
  lottery: LotteryType;
  name: string;
  description: string;
  totalSelectedNumbers: number; // Quantas dezenas o usuário escolhe
  numbersPerTicket: number; // Tamanho de cada bilhete (ex: 15 ou 6)
  guaranteedHit: number; // Ex: 14 pontos ou Quadra (4)
  conditionHit: number; // Se acertar X entre as N escolhidas
  ticketsCount: number; // Quantidade de jogos gerados
  totalCost: number; // Custo total oficial
  comparisonCostFull: number; // Custo do desdobramento total na Caixa
  savingsPercent: number; // Economia percentual
  matrices?: number[][]; // Índices relativos (0-based) de cobertura
}

export interface UserSavedGame extends GeneratedGame {
  folder?: string;
  notes?: string;
  /** Vínculo com um bolão, quando o jogo faz parte de uma cota coletiva. */
  bolaoId?: string;
  checkResult?: {
    drawNumber: number;
    hits: number;
    hitNumbers: number[];
    isWinner: boolean;
    prizeLabel?: string;
    /** Melhor resultado no 2º sorteio da Dupla Sena. */
    secondDrawHits?: number;
    extraHit?: boolean;
    /** Prêmio bruto por bilhete informado pela Caixa para a faixa. */
    valorPremio?: number;
    drawDate?: string;
    conferidoEm?: string;
  };
}

/* ------------------------------------------------------------------ *
 * Backtesting — prova real das estratégias contra o histórico
 * ------------------------------------------------------------------ */

export interface BacktestTierResult {
  label: string;
  hits: number;
  /** Quantos bilhetes simulados bateram exatamente nessa faixa. */
  count: number;
}

export interface BacktestStrategyResult {
  strategy: GeneratorStrategy;
  strategyLabel: string;
  /** Concursos efetivamente simulados. */
  concursosTestados: number;
  ticketsSimulados: number;
  mediaAcertos: number;
  melhorAcerto: number;
  tiers: BacktestTierResult[];
  custoTotal: number;
  retornoEstimado: number;
  /** Diferença de acertos médios contra o baseline aleatório. */
  vantagemSobreAleatorio: number;
}

export interface BacktestReport {
  lottery: LotteryType;
  numbersCount: number;
  janelaConcursos: number;
  ticketsPorConcurso: number;
  baselineAleatorio: number;
  /** Acertos médios esperados pela matemática pura, sem viés de amostra. */
  esperancaTeorica: number;
  resultados: BacktestStrategyResult[];
  geradoEm: string;
}

/* ------------------------------------------------------------------ *
 * Bolão — cotas, rateio e conferência coletiva
 * ------------------------------------------------------------------ */

export interface BolaoParticipant {
  id: string;
  nome: string;
  /** Quantas cotas a pessoa comprou. */
  cotas: number;
  pago: boolean;
  telefone?: string;
}

export interface Bolao {
  id: string;
  nome: string;
  lottery: LotteryType;
  concursoAlvo?: number;
  createdAt: string;
  /** Bilhetes que compõem o bolão. */
  games: GeneratedGame[];
  participantes: BolaoParticipant[];
  /** Taxa de administração em % sobre o prêmio (0 = sem taxa). */
  taxaAdministracao: number;
  encerrado?: boolean;
}

export interface BolaoRateio {
  custoTotal: number;
  totalCotas: number;
  valorPorCota: number;
  arrecadado: number;
  pendente: number;
  participantes: Array<{
    participante: BolaoParticipant;
    valorDevido: number;
    percentual: number;
  }>;
}

export interface BolaoConferencia {
  concurso: number;
  premioBruto: number;
  taxaAdministracao: number;
  premioLiquido: number;
  bilhetesPremiados: Array<{
    game: GeneratedGame;
    hits: number;
    hitNumbers: number[];
    prizeLabel?: string;
  }>;
  distribuicao: Array<{
    participante: BolaoParticipant;
    cotas: number;
    valorReceber: number;
  }>;
}

/* ------------------------------------------------------------------ *
 * Jogo responsável
 * ------------------------------------------------------------------ */

export interface ResponsibleGamingSettings {
  /** Teto de gasto mensal em R$. 0 desativa o controle. */
  limiteMensal: number;
  alertarEm: number; // % do limite que dispara o aviso
  mostrarProbabilidades: boolean;
  atualizadoEm: string;
}

export interface SpendingSummary {
  mesReferencia: string;
  totalApostado: number;
  limiteMensal: number;
  percentualUsado: number;
  restante: number;
  excedido: boolean;
  emAlerta: boolean;
  jogosApostados: number;
}
