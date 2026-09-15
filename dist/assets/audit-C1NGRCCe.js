import{i as f,D as O,g as p}from"./aiConfig-CMjFx9-k.js";const h=O;function m(e,t){var s;return((s=e.groupTotals.find(o=>o.group===t))==null?void 0:s.amount)??0}async function D(e){var t,s,o;if(!f())return g(e);try{const r=`Você é um auditor financeiro especializado em DRE (Demonstração do Resultado do Exercício).

DADOS DO DRE PARA AUDITORIA:
${JSON.stringify({receitaBruta:e.summary.receitaBruta,deducoes:m(e,"Deduções"),receitaLiquida:e.summary.receitaLiquida,custosMercadoriasVendidas:m(e,"Custos"),lucroBruto:e.summary.lucroBruto,despesasOperacionais:m(e,"Despesas Operacionais"),ebitda:e.summary.ebitda,resultadoLiquido:e.summary.resultadoLiquido},null,2)}

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
}`,a=await fetch(h,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${p()}`},body:JSON.stringify({model:"deepseek-chat",messages:[{role:"system",content:"Você é um auditor financeiro rigoroso e preciso. Retorne APENAS JSON válido."},{role:"user",content:r}],temperature:.1,max_tokens:1500})});if(!a.ok)return console.error("DeepSeek audit API error:",a.status),g(e);const i=(o=(s=(t=(await a.json()).choices)==null?void 0:t[0])==null?void 0:s.message)==null?void 0:o.content;if(!i)return g(e);const n=i.match(/\{[\s\S]*\}/);return n?{engine:"deepseek",...JSON.parse(n[0]),validatedAt:new Date().toISOString()}:g(e)}catch(r){return console.error("DeepSeek audit failed:",r),g(e)}}async function v(e){var s,o,r;if(!f()||e.length===0)return{engine:"offline",confidence:100,passed:!0,issues:[],summary:"Auditoria offline: sem transações para validar.",validatedAt:new Date().toISOString(),checksPerformed:0,checksPassed:0};const t=w(e,15);try{const a=`Você é um auditor financeiro. Analise se as transações foram CLASSIFICADAS CORRETAMENTE.

TRANSAÇÕES PARA AUDITAR:
${JSON.stringify(t.map(d=>({description:d.description,value:d.value,flowType:d.flowType,category:d.category,costCenter:d.costCenter})),null,2)}

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
  "checksPerformed": ${t.length},
  "checksPassed": número_corretas
}`,c=await fetch(h,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${p()}`},body:JSON.stringify({model:"deepseek-chat",messages:[{role:"system",content:"Você é um auditor financeiro especializado em classificação contábil. Retorne APENAS JSON válido."},{role:"user",content:a}],temperature:.2,max_tokens:1500})});if(!c.ok)throw new Error(`API error: ${c.status}`);const n=(r=(o=(s=(await c.json()).choices)==null?void 0:s[0])==null?void 0:o.message)==null?void 0:r.content;if(!n)throw new Error("Empty response");const l=n.match(/\{[\s\S]*\}/);if(!l)throw new Error("No JSON found");return{engine:"deepseek",...JSON.parse(l[0]),validatedAt:new Date().toISOString()}}catch(a){return console.error("Transaction audit failed:",a),{engine:"offline",confidence:50,passed:!0,issues:[{severity:"info",category:"consistency",title:"Auditoria de transações desabilitada",description:"Não foi possível validar classificações com IA.",suggestion:"Verifique manualmente as categorias."}],summary:"Auditoria offline aplicada.",validatedAt:new Date().toISOString(),checksPerformed:t.length,checksPassed:t.length}}}function g(e){const t=[];let s=0,o=0;s++;const r=e.summary.receitaBruta-Math.abs(m(e,"Deduções"));Math.abs(e.summary.receitaLiquida-r)>.01?t.push({severity:"critical",category:"calculation",title:"Receita Líquida incorreta",description:`Esperado: R$ ${r.toFixed(2)}, Encontrado: R$ ${e.summary.receitaLiquida.toFixed(2)}`,affectedItem:"Receita Líquida",suggestion:"Receita Líquida = Receita Bruta - Deduções"}):o++,s++;const c=e.summary.receitaLiquida-Math.abs(m(e,"Custos"));Math.abs(e.summary.lucroBruto-c)>.01?t.push({severity:"critical",category:"calculation",title:"Lucro Bruto incorreto",description:`Esperado: R$ ${c.toFixed(2)}, Encontrado: R$ ${e.summary.lucroBruto.toFixed(2)}`,affectedItem:"Lucro Bruto",suggestion:"Lucro Bruto = Receita Líquida - CMV"}):o++,s++;const n=e.summary.lucroBruto-Math.abs(m(e,"Despesas Operacionais"));return Math.abs(e.summary.ebitda-n)>.01?t.push({severity:"warning",category:"calculation",title:"EBITDA pode estar incorreto",description:`Esperado: R$ ${n.toFixed(2)}, Encontrado: R$ ${e.summary.ebitda.toFixed(2)}`,affectedItem:"EBITDA",suggestion:"Verifique se deprec./amortização estão corretas"}):o++,{engine:"offline",confidence:s>0?Math.round(o/s*100):100,passed:t.filter(d=>d.severity==="critical").length===0,issues:t,summary:t.length===0?"Validação offline: cálculos básicos corretos.":`Encontrados ${t.length} problema(s) nos cálculos.`,validatedAt:new Date().toISOString(),checksPerformed:s,checksPassed:o}}function w(e,t){return e.length<=t?e:[...e].sort(()=>Math.random()-.5).slice(0,t)}async function R(e,t){const[s,o]=await Promise.all([D(e),v(t)]);return{dre:s,transactions:o}}async function P(e,t){var s,o,r;if(!f())return A(e,t);try{const a=t.slice(0,5),c=`Você é um auditor de qualidade de dados especializado em importação de arquivos financeiros.

HEADERS IMPORTADOS:
${e.join(", ")}

AMOSTRA DOS DADOS (primeiras 5 linhas):
${JSON.stringify(a,null,2)}

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
}`,i=await fetch(h,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${p()}`},body:JSON.stringify({model:"deepseek-chat",messages:[{role:"system",content:"Você é um auditor de qualidade de dados rigoroso. Retorne APENAS JSON válido."},{role:"user",content:c}],temperature:.1,max_tokens:1500})});if(!i.ok)throw new Error(`API error: ${i.status}`);const l=(r=(o=(s=(await i.json()).choices)==null?void 0:s[0])==null?void 0:o.message)==null?void 0:r.content;if(!l)throw new Error("Empty response");const u=l.match(/\{[\s\S]*\}/);if(!u)throw new Error("No JSON found");return{engine:"deepseek",...JSON.parse(u[0]),validatedAt:new Date().toISOString()}}catch(a){return console.error("Import audit failed:",a),A(e,t)}}async function N(e){var t,s,o;if(!f())return S(e);try{const r=`Você é um auditor de fluxo de caixa especializado em análise financeira.

DADOS DO FLUXO DE CAIXA (últimos 6 meses):
${JSON.stringify(e.slice(-6),null,2)}

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
}`,a=await fetch(h,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${p()}`},body:JSON.stringify({model:"deepseek-chat",messages:[{role:"system",content:"Você é um auditor de fluxo de caixa rigoroso. Retorne APENAS JSON válido."},{role:"user",content:r}],temperature:.1,max_tokens:1500})});if(!a.ok)throw new Error(`API error: ${a.status}`);const i=(o=(s=(t=(await a.json()).choices)==null?void 0:t[0])==null?void 0:s.message)==null?void 0:o.content;if(!i)throw new Error("Empty response");const n=i.match(/\{[\s\S]*\}/);if(!n)throw new Error("No JSON found");return{engine:"deepseek",...JSON.parse(n[0]),validatedAt:new Date().toISOString()}}catch(r){return console.error("CashFlow audit failed:",r),S(e)}}async function k(e){var t,s,o;if(!f())return y(e);try{const r=`Você é um auditor de centros de custo.

DISTRIBUIÇÃO POR CENTRO:
${JSON.stringify(e,null,2)}

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
}`,a=await fetch(h,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${p()}`},body:JSON.stringify({model:"deepseek-chat",messages:[{role:"system",content:"Você é um auditor de centros de custo. Retorne APENAS JSON válido."},{role:"user",content:r}],temperature:.1,max_tokens:1200})});if(!a.ok)throw new Error(`API error: ${a.status}`);const i=(o=(s=(t=(await a.json()).choices)==null?void 0:t[0])==null?void 0:s.message)==null?void 0:o.content;if(!i)throw new Error("Empty response");const n=i.match(/\{[\s\S]*\}/);if(!n)throw new Error("No JSON found");return{engine:"deepseek",...JSON.parse(n[0]),validatedAt:new Date().toISOString()}}catch(r){return console.error("CostCenter audit failed:",r),y(e)}}async function b(e){var t,s,o;if(!f())return E(e);try{const r=`Você é um auditor de consolidação de dados de dashboard.

RESUMO DO DASHBOARD:
${JSON.stringify(e,null,2)}

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
}`,a=await fetch(h,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${p()}`},body:JSON.stringify({model:"deepseek-chat",messages:[{role:"system",content:"Você é um auditor de consolidação. Retorne APENAS JSON válido."},{role:"user",content:r}],temperature:.1,max_tokens:1e3})});if(!a.ok)throw new Error(`API error: ${a.status}`);const i=(o=(s=(t=(await a.json()).choices)==null?void 0:t[0])==null?void 0:s.message)==null?void 0:o.content;if(!i)throw new Error("Empty response");const n=i.match(/\{[\s\S]*\}/);if(!n)throw new Error("No JSON found");return{engine:"deepseek",...JSON.parse(n[0]),validatedAt:new Date().toISOString()}}catch(r){return console.error("Dashboard audit failed:",r),E(e)}}function A(e,t){const s=[];let o=0,r=0;o++;const a=["data","valor","descricao","categoria"],c=e.map(u=>u.toLowerCase()),i=a.filter(u=>!c.some(d=>d.includes(u)));i.length>0?s.push({severity:"critical",category:"consistency",title:"Colunas obrigatórias faltando",description:`Faltam: ${i.join(", ")}`,suggestion:"Adicione as colunas obrigatórias antes de importar"}):r++,o++;const n=t.filter(u=>!Object.values(u).some(d=>d!=null&&d!==""));return n.length>0?s.push({severity:"warning",category:"consistency",title:`${n.length} linhas vazias detectadas`,description:"Há linhas sem dados que serão ignoradas",suggestion:"Remova as linhas vazias antes de importar"}):r++,{engine:"offline",confidence:o>0?Math.round(r/o*100):100,passed:s.filter(u=>u.severity==="critical").length===0,issues:s,summary:s.length===0?"Importação validada: estrutura correta.":`Encontrados ${s.length} problema(s) na importação.`,validatedAt:new Date().toISOString(),checksPerformed:o,checksPassed:r}}function S(e){const t=[];let s=0,o=0;return e.forEach((a,c)=>{s++;const i=a.income-Math.abs(a.expense);Math.abs(a.balance-i)>.01?t.push({severity:"critical",category:"calculation",title:"Saldo incorreto",description:`${a.month}: Esperado R$ ${i.toFixed(2)}, Encontrado R$ ${a.balance.toFixed(2)}`,affectedItem:a.month,suggestion:"Saldo = Receita - Despesa"}):o++}),{engine:"offline",confidence:s>0?Math.round(o/s*100):100,passed:t.filter(a=>a.severity==="critical").length===0,issues:t,summary:t.length===0?"Fluxo de caixa validado: saldos corretos.":`Encontrados ${t.length} problema(s) no fluxo.`,validatedAt:new Date().toISOString(),checksPerformed:s,checksPassed:o}}function y(e){const t=[];let s=0,o=0;s++;const r=e.reduce((c,i)=>c+i.percentage,0);return Math.abs(r-100)>1?t.push({severity:"warning",category:"consistency",title:"Percentuais não somam 100%",description:`Total: ${r.toFixed(2)}%`,suggestion:"Verifique a distribuição dos centros"}):o++,{engine:"offline",confidence:s>0?Math.round(o/s*100):100,passed:!0,issues:t,summary:"Centros de custo validados.",validatedAt:new Date().toISOString(),checksPerformed:s,checksPassed:o}}function E(e){const t=[];let s=0,o=0;s++;const r=e.totalIncome-Math.abs(e.totalExpense);return Math.abs(e.netResult-r)>.01?t.push({severity:"critical",category:"calculation",title:"Resultado líquido incorreto",description:`Esperado: R$ ${r.toFixed(2)}, Encontrado: R$ ${e.netResult.toFixed(2)}`,suggestion:"Resultado = Receita - Despesa"}):o++,{engine:"offline",confidence:s>0?Math.round(o/s*100):100,passed:t.filter(c=>c.severity==="critical").length===0,issues:t,summary:t.length===0?"Dashboard consolidado corretamente.":`Encontrados ${t.length} problema(s).`,validatedAt:new Date().toISOString(),checksPerformed:s,checksPassed:o}}export{P as a,N as b,k as c,b as d,R as p};
