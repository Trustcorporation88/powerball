export type LotteryType = 'megasena' | 'lotofacil';

export interface LotteryConfig {
  type: LotteryType;
  name: string;
  fullName: string;
  color: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  totalNumbers: number; // 60 para Mega, 25 para Lotofácil
  minSelection: number; // 6 para Mega, 15 para Lotofácil
  maxSelection: number; // 15 para Mega, 20 para Lotofácil
  drawDays: string[];
  priceTable: Record<number, number>; // dezenas -> preço oficial em R$
  colsGrid: number; // 10 para Mega (6x10), 5 para Lotofácil (5x5)
  frameNumbers?: number[]; // Moldura (Lotofácil)
  centerNumbers?: number[]; // Miolo (Lotofácil)
  primeNumbers: number[];
  idealSumRange: [number, number];
  idealEvenRange: [number, number];
}

export interface LotteryDraw {
  loteria: LotteryType;
  concurso: number;
  data: string;
  local?: string;
  dezenas: number[];
  dezenasOrdemSorteio?: number[];
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
}

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
}

export interface GeneratedGame {
  id: string;
  lottery: LotteryType;
  numbers: number[];
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
  checkResult?: {
    drawNumber: number;
    hits: number;
    hitNumbers: number[];
    isWinner: boolean;
    prizeLabel?: string;
  };
}
