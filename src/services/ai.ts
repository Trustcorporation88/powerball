import { DEEPSEEK_API_URL, getDeepSeekApiKey, isAIEnabled } from './aiConfig';

const DEEPSEEK_API = DEEPSEEK_API_URL;

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
  answer?: string;
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
  if (!isAIEnabled()) {
    console.info('DeepSeek desativada — usando fallback local');
    return keywordFallback(question);
  }

  const apiKey = getDeepSeekApiKey();

  try {
    const prompt = `Você é um assistente financeiro especializado em análise de DRE e relatórios gerenciais.

Dados atuais:
- Receita total: R$ ${context.totalIncome.toFixed(2)}
- Despesa total: R$ ${context.totalExpense.toFixed(2)}
- Saldo líquido: R$ ${context.balance.toFixed(2)}
- Categorias disponíveis: ${context.categories.join(', ')}
- Centros de custo: ${context.costCenters.join(', ')}
- Período: ${context.dateRange}

Pergunta do usuário: ${question}

Responda de forma OBJETIVA E CURTA (máximo 2 frases) e em JSON com esta estrutura:
{
  "type": "kpi" | "bar" | "line" | "pie" | "table",
  "title": "Título do gráfico/análise",
  "answer": "Resposta curta e direta",
  "filter": { "category": "nome", "costCenter": "nome", "period": "thisMonth" }
}

Se a pergunta não puder ser respondida com os dados disponíveis, retorne type: "error" e explique brevemente.`;

    const response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Você é um assistente financeiro preciso e objetivo.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('DeepSeek API error:', response.status);
      return keywordFallback(question);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return keywordFallback(question);
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return keywordFallback(question);
    }

    const result = JSON.parse(jsonMatch[0]);
    return result as NLPResult;
  } catch (error) {
    console.error('DeepSeek query failed:', error);
    return keywordFallback(question);
  }
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
