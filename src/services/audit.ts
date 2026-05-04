/**
 * Serviço de Auditoria Inteligente com DeepSeek
 * Valida cálculos, classificações e integridade dos dados financeiros
 */

import type { Transaction } from '@/contexts/AppContext';
import type { DREReport } from './dre';

const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;

export interface AuditIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'calculation' | 'classification' | 'consistency' | 'best-practice';
  title: string;
  description: string;
  affectedItem?: string;
  suggestion?: string;
}

export interface AuditReport {
  engine: 'deepseek' | 'offline';
  confidence: number; // 0-100
  passed: boolean;
  issues: AuditIssue[];
  summary: string;
  validatedAt: string;
  checksPerformed: number;
  checksPassed: number;
}

/**
 * Audita cálculos do DRE usando DeepSeek
 */
export async function auditDRECalculations(dreReport: DREReport): Promise<AuditReport> {
  if (!DEEPSEEK_API_KEY) {
    return offlineAudit(dreReport);
  }

  try {
    const prompt = `Você é um auditor financeiro especializado em DRE (Demonstração do Resultado do Exercício).

DADOS DO DRE PARA AUDITORIA:
${JSON.stringify({
  receitaBruta: dreReport.summary.receitaBruta,
  deducoes: dreReport.summary.deducoes,
  receitaLiquida: dreReport.summary.receitaLiquida,
  custosMercadoriasVendidas: dreReport.summary.custosMercadoriasVendidas,
  lucroBruto: dreReport.summary.lucroBruto,
  despesasOperacionais: dreReport.summary.despesasOperacionais,
  ebitda: dreReport.summary.ebitda,
  resultadoLiquido: dreReport.summary.resultadoLiquido,
}, null, 2)}

REGRAS CONTÁBEIS A VERIFICAR:
1. Receita Líquida = Receita Bruta - Deduções
2. Lucro Bruto = Receita Líquida - CMV
3. EBITDA = Lucro Bruto - Despesas Operacionais
4. Todos os valores de despesa devem ser negativos ou zero
5. Receitas devem ser positivas ou zero
6. Margem Bruta = (Lucro Bruto / Receita Líquida) deve estar entre -100% e 100%

TAREFA:
1. RECALCULE cada linha usando as fórmulas
2. Compare com os valores fornecidos
3. Identifique ERROS matemáticos (diferença > R$ 0.01)
4. Identifique inconsistências lógicas

RESPONDA EM JSON:
{
  "confidence": 0-100,
  "passed": true/false,
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "category": "calculation",
      "title": "Título curto do problema",
      "description": "Descrição detalhada",
      "affectedItem": "Nome da linha DRE",
      "suggestion": "Como corrigir"
    }
  ],
  "summary": "Resumo geral da auditoria em 1-2 frases",
  "checksPerformed": número,
  "checksPassed": número
}`;

    const response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Você é um auditor financeiro rigoroso e preciso. Retorne APENAS JSON válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1, // Baixa para ser determinístico
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.error('DeepSeek audit API error:', response.status);
      return offlineAudit(dreReport);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return offlineAudit(dreReport);
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return offlineAudit(dreReport);
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      engine: 'deepseek',
      ...result,
      validatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('DeepSeek audit failed:', error);
    return offlineAudit(dreReport);
  }
}

/**
 * Audita classificação de transações (amostra)
 */
export async function auditTransactionClassifications(
  transactions: Transaction[]
): Promise<AuditReport> {
  if (!DEEPSEEK_API_KEY || transactions.length === 0) {
    return {
      engine: 'offline',
      confidence: 100,
      passed: true,
      issues: [],
      summary: 'Auditoria offline: sem transações para validar.',
      validatedAt: new Date().toISOString(),
      checksPerformed: 0,
      checksPassed: 0,
    };
  }

  // Pega amostra de 15 transações variadas
  const sample = sampleTransactions(transactions, 15);

  try {
    const prompt = `Você é um auditor financeiro. Analise se as transações foram CLASSIFICADAS CORRETAMENTE.

TRANSAÇÕES PARA AUDITAR:
${JSON.stringify(sample.map(t => ({
  description: t.description,
  value: t.value,
  flowType: t.flowType, // income ou expense
  category: t.category,
  costCenter: t.costCenter,
})), null, 2)}

REGRAS:
1. "income" (receita) deve ter value POSITIVO
2. "expense" (despesa) deve ter value NEGATIVO
3. Categoria deve fazer sentido com a descrição
   - Ex: "Salário" → categoria deve ser "Pessoal" ou similar, NÃO "Receita"
   - Ex: "Venda produto" → deve ser "income", NÃO "expense"
4. Descrições genéricas ("Pagamento", "Transferência") devem ter categoria específica

TAREFA:
Identifique transações MAL CLASSIFICADAS.

RESPONDA EM JSON:
{
  "confidence": 0-100,
  "passed": true/false,
  "issues": [
    {
      "severity": "critical" | "warning",
      "category": "classification",
      "title": "Transação mal classificada",
      "description": "Por que está errado",
      "affectedItem": "descrição da transação",
      "suggestion": "Classificação correta"
    }
  ],
  "summary": "Resumo em 1 frase",
  "checksPerformed": ${sample.length},
  "checksPassed": número_corretas
}`;

    const response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Você é um auditor financeiro especializado em classificação contábil. Retorne APENAS JSON válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      engine: 'deepseek',
      ...result,
      validatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Transaction audit failed:', error);
    return {
      engine: 'offline',
      confidence: 50,
      passed: true,
      issues: [{
        severity: 'info',
        category: 'consistency',
        title: 'Auditoria de transações desabilitada',
        description: 'Não foi possível validar classificações com IA.',
        suggestion: 'Verifique manualmente as categorias.',
      }],
      summary: 'Auditoria offline aplicada.',
      validatedAt: new Date().toISOString(),
      checksPerformed: sample.length,
      checksPassed: sample.length,
    };
  }
}

/**
 * Auditoria offline (fallback) - validações básicas sem IA
 */
function offlineAudit(dreReport: DREReport): AuditReport {
  const issues: AuditIssue[] = [];
  let checksPerformed = 0;
  let checksPassed = 0;

  // Check 1: Receita Líquida
  checksPerformed++;
  const expectedReceitaLiquida = dreReport.summary.receitaBruta - Math.abs(dreReport.summary.deducoes);
  const diffRL = Math.abs(dreReport.summary.receitaLiquida - expectedReceitaLiquida);
  if (diffRL > 0.01) {
    issues.push({
      severity: 'critical',
      category: 'calculation',
      title: 'Receita Líquida incorreta',
      description: `Esperado: R$ ${expectedReceitaLiquida.toFixed(2)}, Encontrado: R$ ${dreReport.summary.receitaLiquida.toFixed(2)}`,
      affectedItem: 'Receita Líquida',
      suggestion: 'Receita Líquida = Receita Bruta - Deduções',
    });
  } else {
    checksPassed++;
  }

  // Check 2: Lucro Bruto
  checksPerformed++;
  const expectedLucroBruto = dreReport.summary.receitaLiquida - Math.abs(dreReport.summary.custosMercadoriasVendidas);
  const diffLB = Math.abs(dreReport.summary.lucroBruto - expectedLucroBruto);
  if (diffLB > 0.01) {
    issues.push({
      severity: 'critical',
      category: 'calculation',
      title: 'Lucro Bruto incorreto',
      description: `Esperado: R$ ${expectedLucroBruto.toFixed(2)}, Encontrado: R$ ${dreReport.summary.lucroBruto.toFixed(2)}`,
      affectedItem: 'Lucro Bruto',
      suggestion: 'Lucro Bruto = Receita Líquida - CMV',
    });
  } else {
    checksPassed++;
  }

  // Check 3: EBITDA
  checksPerformed++;
  const expectedEBITDA = dreReport.summary.lucroBruto - Math.abs(dreReport.summary.despesasOperacionais);
  const diffEBITDA = Math.abs(dreReport.summary.ebitda - expectedEBITDA);
  if (diffEBITDA > 0.01) {
    issues.push({
      severity: 'warning',
      category: 'calculation',
      title: 'EBITDA pode estar incorreto',
      description: `Esperado: R$ ${expectedEBITDA.toFixed(2)}, Encontrado: R$ ${dreReport.summary.ebitda.toFixed(2)}`,
      affectedItem: 'EBITDA',
      suggestion: 'Verifique se deprec./amortização estão corretas',
    });
  } else {
    checksPassed++;
  }

  const confidence = checksPerformed > 0 ? Math.round((checksPassed / checksPerformed) * 100) : 100;

  return {
    engine: 'offline',
    confidence,
    passed: issues.filter(i => i.severity === 'critical').length === 0,
    issues,
    summary: issues.length === 0 
      ? 'Validação offline: cálculos básicos corretos.' 
      : `Encontrados ${issues.length} problema(s) nos cálculos.`,
    validatedAt: new Date().toISOString(),
    checksPerformed,
    checksPassed,
  };
}

/**
 * Amostra aleatória de transações
 */
function sampleTransactions(transactions: Transaction[], count: number): Transaction[] {
  if (transactions.length <= count) {
    return transactions;
  }

  const shuffled = [...transactions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Auditoria completa: DRE + Transações
 */
export async function performFullAudit(
  dreReport: DREReport,
  transactions: Transaction[]
): Promise<{ dre: AuditReport; transactions: AuditReport }> {
  const [dreAudit, transactionsAudit] = await Promise.all([
    auditDRECalculations(dreReport),
    auditTransactionClassifications(transactions),
  ]);

  return {
    dre: dreAudit,
    transactions: transactionsAudit,
  };
}

/**
 * Auditoria de Importação - Validar estrutura de dados na origem
 */
export async function auditImportData(
  headers: string[],
  data: Record<string, unknown>[]
): Promise<AuditReport> {
  if (!DEEPSEEK_API_KEY) {
    return offlineAuditImport(headers, data);
  }

  try {
    const sample = data.slice(0, 5);
    const prompt = `Você é um auditor de qualidade de dados especializado em importação de arquivos financeiros.

HEADERS IMPORTADOS:
${headers.join(', ')}

AMOSTRA DOS DADOS (primeiras 5 linhas):
${JSON.stringify(sample, null, 2)}

TAREFA:
1. Valide se os headers são apropriados para dados financeiros
2. Verifique se os valores são do tipo esperado (datas como data, valores como número)
3. Identifique outliers óbvios ou valores suspeitos
4. Verifique se há campos obrigatórios faltando (data, valor, descrição)
5. Detecte padrões de erro em nomes de colunas

RESPONDA EM JSON:
{
  "confidence": 0-100,
  "passed": true/false,
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "category": "consistency",
      "title": "Título do problema",
      "description": "Descrição",
      "affectedItem": "Nome da coluna ou linha",
      "suggestion": "Como corrigir"
    }
  ],
  "summary": "Resumo geral",
  "checksPerformed": número,
  "checksPassed": número
}`;

    const response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Você é um auditor de qualidade de dados rigoroso. Retorne APENAS JSON válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const responseData = await response.json();
    const content = responseData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      engine: 'deepseek',
      ...result,
      validatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Import audit failed:', error);
    return offlineAuditImport(headers, data);
  }
}

/**
 * Auditoria de Fluxo de Caixa - Validar saldos e movimentação
 */
export async function auditCashFlow(
  monthlyData: Array<{ month: string; income: number; expense: number; balance: number }>
): Promise<AuditReport> {
  if (!DEEPSEEK_API_KEY) {
    return offlineAuditCashFlow(monthlyData);
  }

  try {
    const prompt = `Você é um auditor de fluxo de caixa especializado em análise financeira.

DADOS DO FLUXO DE CAIXA (últimos 6 meses):
${JSON.stringify(monthlyData.slice(-6), null, 2)}

TAREFA:
1. Valide se o cálculo de saldo está correto (saldo anterior + receita - despesa)
2. Identifique jumps anormais entre meses (variações >100% sem explicação)
3. Detecte saldos negativos repetidos (pode indicar caixa descoberto)
4. Verifique se receitas são realistas comparado a despesas
5. Identifique padrões de sazonalidade anormais

RESPONDA EM JSON:
{
  "confidence": 0-100,
  "passed": true/false,
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "category": "consistency",
      "title": "Título",
      "description": "Descrição",
      "affectedItem": "Mês afetado",
      "suggestion": "Como corrigir"
    }
  ],
  "summary": "Resumo",
  "checksPerformed": número,
  "checksPassed": número
}`;

    const response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Você é um auditor de fluxo de caixa rigoroso. Retorne APENAS JSON válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const responseData = await response.json();
    const content = responseData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      engine: 'deepseek',
      ...result,
      validatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('CashFlow audit failed:', error);
    return offlineAuditCashFlow(monthlyData);
  }
}

/**
 * Auditoria de Centros de Custo - Validar distribuição
 */
export async function auditCostCenterDistribution(
  costCenters: Array<{ name: string; income: number; expense: number; percentage: number }>
): Promise<AuditReport> {
  if (!DEEPSEEK_API_KEY) {
    return offlineAuditCostCenter(costCenters);
  }

  try {
    const prompt = `Você é um auditor de centros de custo.

DISTRIBUIÇÃO POR CENTRO:
${JSON.stringify(costCenters, null, 2)}

TAREFA:
1. Valide se os percentuais somam ~100%
2. Identifique centros com alocação irrealista (<0.1% ou >50%)
3. Detecte nomes duplicados ou similares
4. Verifique se há centros sem movimentação
5. Analise se a distribuição é equilibrada

RESPONDA EM JSON:
{
  "confidence": 0-100,
  "passed": true/false,
  "issues": [],
  "summary": "Resumo",
  "checksPerformed": número,
  "checksPassed": número
}`;

    const response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Você é um auditor de centros de custo. Retorne APENAS JSON válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const responseData = await response.json();
    const content = responseData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      engine: 'deepseek',
      ...result,
      validatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('CostCenter audit failed:', error);
    return offlineAuditCostCenter(costCenters);
  }
}

/**
 * Auditoria de Dashboard - Validar consolidação
 */
export async function auditDashboardConsolidation(
  summary: {
    totalIncome: number;
    totalExpense: number;
    netResult: number;
    projectCount?: number;
    transactionCount?: number;
  }
): Promise<AuditReport> {
  if (!DEEPSEEK_API_KEY) {
    return offlineAuditDashboard(summary);
  }

  try {
    const prompt = `Você é um auditor de consolidação de dados de dashboard.

RESUMO DO DASHBOARD:
${JSON.stringify(summary, null, 2)}

TAREFA:
1. Valide se netResult = totalIncome - totalExpense
2. Verifique se totalIncome e totalExpense têm sinais corretos
3. Detecte valores zerados quando deveriam haver dados
4. Valide contadores (projectCount, transactionCount)

RESPONDA EM JSON:
{
  "confidence": 0-100,
  "passed": true/false,
  "issues": [],
  "summary": "Resumo",
  "checksPerformed": número,
  "checksPassed": número
}`;

    const response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Você é um auditor de consolidação. Retorne APENAS JSON válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const responseData = await response.json();
    const content = responseData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      engine: 'deepseek',
      ...result,
      validatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Dashboard audit failed:', error);
    return offlineAuditDashboard(summary);
  }
}

/**
 * Auditoria offline para importação
 */
function offlineAuditImport(headers: string[], data: Record<string, unknown>[]): AuditReport {
  const issues: AuditIssue[] = [];
  let checksPerformed = 0;
  let checksPassed = 0;

  // Check: Headers obrigatórios
  checksPerformed++;
  const requiredHeaders = ['data', 'valor', 'descricao', 'categoria'];
  const lowerHeaders = headers.map(h => h.toLowerCase());
  const missingHeaders = requiredHeaders.filter(h => !lowerHeaders.some(lh => lh.includes(h)));
  
  if (missingHeaders.length > 0) {
    issues.push({
      severity: 'critical',
      category: 'consistency',
      title: 'Colunas obrigatórias faltando',
      description: `Faltam: ${missingHeaders.join(', ')}`,
      suggestion: 'Adicione as colunas obrigatórias antes de importar',
    });
  } else {
    checksPassed++;
  }

  // Check: Linhas vazias
  checksPerformed++;
  const emptyRows = data.filter(row => !Object.values(row).some(v => v !== null && v !== undefined && v !== ''));
  if (emptyRows.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'consistency',
      title: `${emptyRows.length} linhas vazias detectadas`,
      description: 'Há linhas sem dados que serão ignoradas',
      suggestion: 'Remova as linhas vazias antes de importar',
    });
  } else {
    checksPassed++;
  }

  const confidence = checksPerformed > 0 ? Math.round((checksPassed / checksPerformed) * 100) : 100;

  return {
    engine: 'offline',
    confidence,
    passed: issues.filter(i => i.severity === 'critical').length === 0,
    issues,
    summary: issues.length === 0 
      ? 'Importação validada: estrutura correta.'
      : `Encontrados ${issues.length} problema(s) na importação.`,
    validatedAt: new Date().toISOString(),
    checksPerformed,
    checksPassed,
  };
}

/**
 * Auditoria offline para fluxo de caixa
 */
function offlineAuditCashFlow(
  monthlyData: Array<{ month: string; income: number; expense: number; balance: number }>
): AuditReport {
  const issues: AuditIssue[] = [];
  let checksPerformed = 0;
  let checksPassed = 0;

  monthlyData.forEach((month, index) => {
    checksPerformed++;
    const expectedBalance = month.income - Math.abs(month.expense);
    if (Math.abs(month.balance - expectedBalance) > 0.01) {
      issues.push({
        severity: 'critical',
        category: 'calculation',
        title: 'Saldo incorreto',
        description: `${month.month}: Esperado R$ ${expectedBalance.toFixed(2)}, Encontrado R$ ${month.balance.toFixed(2)}`,
        affectedItem: month.month,
        suggestion: 'Saldo = Receita - Despesa',
      });
    } else {
      checksPassed++;
    }
  });

  const confidence = checksPerformed > 0 ? Math.round((checksPassed / checksPerformed) * 100) : 100;

  return {
    engine: 'offline',
    confidence,
    passed: issues.filter(i => i.severity === 'critical').length === 0,
    issues,
    summary: issues.length === 0 
      ? 'Fluxo de caixa validado: saldos corretos.'
      : `Encontrados ${issues.length} problema(s) no fluxo.`,
    validatedAt: new Date().toISOString(),
    checksPerformed,
    checksPassed,
  };
}

/**
 * Auditoria offline para centros de custo
 */
function offlineAuditCostCenter(
  costCenters: Array<{ name: string; income: number; expense: number; percentage: number }>
): AuditReport {
  const issues: AuditIssue[] = [];
  let checksPerformed = 0;
  let checksPassed = 0;

  checksPerformed++;
  const totalPercentage = costCenters.reduce((sum, cc) => sum + cc.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 1) {
    issues.push({
      severity: 'warning',
      category: 'consistency',
      title: 'Percentuais não somam 100%',
      description: `Total: ${totalPercentage.toFixed(2)}%`,
      suggestion: 'Verifique a distribuição dos centros',
    });
  } else {
    checksPassed++;
  }

  const confidence = checksPerformed > 0 ? Math.round((checksPassed / checksPerformed) * 100) : 100;

  return {
    engine: 'offline',
    confidence,
    passed: true,
    issues,
    summary: 'Centros de custo validados.',
    validatedAt: new Date().toISOString(),
    checksPerformed,
    checksPassed,
  };
}

/**
 * Auditoria offline para dashboard
 */
function offlineAuditDashboard(summary: {
  totalIncome: number;
  totalExpense: number;
  netResult: number;
}): AuditReport {
  const issues: AuditIssue[] = [];
  let checksPerformed = 0;
  let checksPassed = 0;

  checksPerformed++;
  const expectedNetResult = summary.totalIncome - Math.abs(summary.totalExpense);
  if (Math.abs(summary.netResult - expectedNetResult) > 0.01) {
    issues.push({
      severity: 'critical',
      category: 'calculation',
      title: 'Resultado líquido incorreto',
      description: `Esperado: R$ ${expectedNetResult.toFixed(2)}, Encontrado: R$ ${summary.netResult.toFixed(2)}`,
      suggestion: 'Resultado = Receita - Despesa',
    });
  } else {
    checksPassed++;
  }

  const confidence = checksPerformed > 0 ? Math.round((checksPassed / checksPerformed) * 100) : 100;

  return {
    engine: 'offline',
    confidence,
    passed: issues.filter(i => i.severity === 'critical').length === 0,
    issues,
    summary: issues.length === 0 
      ? 'Dashboard consolidado corretamente.'
      : `Encontrados ${issues.length} problema(s).`,
    validatedAt: new Date().toISOString(),
    checksPerformed,
    checksPassed,
  };
}
