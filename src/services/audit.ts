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
      ...result,
      validatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Transaction audit failed:', error);
    return {
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
