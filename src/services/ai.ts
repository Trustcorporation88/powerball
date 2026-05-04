const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions';
export const EXTERNAL_AI_DISABLED_REASON = 'IA externa desativada para proteger dados financeiros sensíveis.';

interface NLPResult {
  type: 'kpi' | 'bar' | 'line' | 'pie' | 'table' | 'area' | 'error';
  title: string;
  filter?: {
    category?: string;
    costCenter?: string;
    period?: string;
    search?: string;
  };
  error?: string;
}

export async function queryNLP(
  question: string,
  context: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    categories: string[];
    costCenters: string[];
    dateRange: string;
  }
): Promise<NLPResult> {
  console.info(EXTERNAL_AI_DISABLED_REASON, {
    endpoint: DEEPSEEK_API,
    categories: context.categories.length,
    costCenters: context.costCenters.length,
  });
  return keywordFallback(question);
}

function keywordFallback(question: string): NLPResult {
  const q = question.toLowerCase();

  if ((q.includes('compare') || q.includes('compar')) && q.includes('receita') && q.includes('despesa')) {
    return { type: 'line', title: 'Receita vs Despesa' };
  }
  if (q.includes('saldo') && (q.includes('mês') || q.includes('mes') || q.includes('mensal'))) {
    return { type: 'line', title: 'Saldo Líquido por Mês' };
  }
  if (q.includes('top') && q.includes('despesa')) {
    return { type: 'bar', title: 'Top 5 Despesas' };
  }
  if (q.includes('centro de custo') && (q.includes('gasta mais') || q.includes('maior'))) {
    return { type: 'pie', title: 'Centro de Custo com Maior Despesa' };
  }
  if (q.includes('distribuição') && q.includes('categoria')) {
    return { type: 'pie', title: 'Distribuição por Categoria' };
  }
  if (q.includes('receita') && (q.includes('categoria') || q.includes('por'))) {
    return { type: 'bar', title: 'Receita por Categoria' };
  }
  if (q.includes('despesa') && (q.includes('categoria') || q.includes('por'))) {
    return { type: 'bar', title: 'Despesas por Categoria' };
  }
  if (q.includes('receita total') || q.includes('faturamento total')) {
    return { type: 'kpi', title: 'Receita Total' };
  }
  if (q.includes('despesa total') || q.includes('gasto total')) {
    return { type: 'kpi', title: 'Despesa Total' };
  }
  if (q.includes('saldo') || q.includes('lucro') || q.includes('resultado')) {
    return { type: 'kpi', title: 'Saldo Líquido' };
  }
  if (q.includes('centro de custo') || q.includes('centros de custo')) {
    return { type: 'pie', title: 'Por Centro de Custo' };
  }
  if (q.includes('evolução') || q.includes('mensal') || q.includes('tempo')) {
    return { type: 'line', title: 'Evolução Mensal' };
  }
  if (q.includes('margem') || q.includes('margem operacional')) {
    return { type: 'kpi', title: 'Margem Operacional' };
  }
  if (q.includes('transação') || q.includes('lista') || q.includes('lançamento')) {
    return { type: 'table', title: 'Transações' };
  }

  return { type: 'bar', title: 'Despesas por Categoria' };
}
