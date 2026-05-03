const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions';

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
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (!apiKey) {
    return keywordFallback(question);
  }

  try {
    const prompt = `Você é um assistente de análise de dados financeiros. O usuário fará uma pergunta sobre seus dados.

Contexto dos dados:
- Receita total: R$ ${context.totalIncome.toLocaleString('pt-BR')}
- Despesa total: R$ ${context.totalExpense.toLocaleString('pt-BR')}
- Saldo: R$ ${context.balance.toLocaleString('pt-BR')}
- Categorias: ${context.categories.join(', ')}
- Centros de custo: ${context.costCenters.join(', ')}
- Período: ${context.dateRange}

Pergunta do usuário: "${question}"

Responda APENAS com um JSON neste formato exato, sem texto adicional:
{
  "type": "bar" | "line" | "pie" | "kpi" | "table" | "area",
  "title": "título descritivo do gráfico",
  "filter": {
    "category": "nome da categoria ou null",
    "costCenter": "nome do centro de custo ou null",
    "period": "today|7days|30days|thisMonth|thisQuarter|thisYear|all",
    "search": "termo de busca ou null"
  }
}

Escolha o tipo:
- "bar": comparação de categorias (ex: "despesas por categoria", "top categorias")
- "pie": composição/proporção (ex: "distribuição dos gastos", "composição")
- "line": evolução temporal (ex: "evolução mensal", "receita ao longo do tempo")
- "kpi": valor único (ex: "receita total", "despesa total", "qual o saldo")
- "table": listagem (ex: "mostre transações", "lista de")
- "area": tendência com área (ex: "tendência de receita e despesa")`;

    const response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      return keywordFallback(question);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return keywordFallback(question);
  } catch (e) {
    console.warn('DeepSeek NLP failed, using keyword fallback', e);
    return keywordFallback(question);
  }
}

function keywordFallback(question: string): NLPResult {
  const q = question.toLowerCase();

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
  if (q.includes('top') && q.includes('despesa')) {
    return { type: 'bar', title: 'Top Despesas', filter: {} };
  }
  if (q.includes('margem') || q.includes('margem operacional')) {
    return { type: 'kpi', title: 'Margem Operacional' };
  }
  if (q.includes('transação') || q.includes('lista') || q.includes('lançamento')) {
    return { type: 'table', title: 'Transações' };
  }

  return { type: 'bar', title: 'Despesas por Categoria' };
}
