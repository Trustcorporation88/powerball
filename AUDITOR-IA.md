# 🤖 Auditor Inteligente DeepSeek

## O que faz?

O Auditor Inteligente usa **IA DeepSeek** para validar se os dados financeiros estão **MATEMATICAMENTE CORRETOS** antes da entrega final.

---

## ✅ O que é validado?

### 1. **Cálculos do DRE**
A IA recalcula todas as linhas e compara com os valores do sistema:

```
✓ Receita Líquida = Receita Bruta - Deduções
✓ Lucro Bruto = Receita Líquida - CMV  
✓ EBITDA = Lucro Bruto - Despesas Operacionais
✓ Resultado Líquido = EBITDA - Impostos/Juros
```

**Precisão:** Detecta erros > R$ 0,01

---

### 2. **Classificação de Transações**
A IA analisa uma amostra de 15 transações e verifica:

- ❌ "Salário" marcado como "Receita" → **ERRO CRÍTICO**
- ❌ Valor de despesa positivo → **ERRO**
- ❌ Categoria genérica ("Pagamento") → **AVISO**
- ✅ "Venda de Produto" como "Receita" → **CORRETO**

---

## 🎯 Como usar?

### **No DRE:**

1. Importe seus dados (ou use Dados Demo)
2. Role até a seção **"Auditoria Inteligente (DeepSeek)"**
3. Clique no botão: **"Auditar com IA"** ✨
4. Aguarde ~10 segundos
5. Veja o relatório:
   - ✅ Verde = Aprovado (confiança 100%)
   - ⚠️ Amarelo = Avisos (confiança 80-99%)
   - ❌ Vermelho = Problemas críticos (confiança < 80%)

---

## 📊 Exemplo de Relatório

```
✅ Auditoria Aprovada
Confiança nos Dados: 98%

Auditoria DRE (Cálculos)
├─ Verificações: 6
├─ Aprovadas: 6
└─ ✓ Todos os cálculos estão corretos

Auditoria Transações (Classificações)  
├─ Verificações: 15
├─ Aprovadas: 13
└─ ⚠️ 2 avisos encontrados:
    1. "Pagamento" → categoria muito genérica
    2. "Transferência" → sugerido: "Transferência Bancária"
```

---

## 🔴 O que acontece quando há ERRO CRÍTICO?

```
❌ Problemas Críticos Encontrados

Auditoria DRE (Cálculos)
├─ Confiança: 65%
└─ 🔴 CRÍTICO: Lucro Bruto incorreto
    Esperado: R$ 15.230,00
    Encontrado: R$ 15.500,00
    
    💡 Sugestão:
    Lucro Bruto = Receita Líquida - CMV
    Verifique se todas as transações de CMV foram incluídas.
```

→ **A entrega é BLOQUEADA** até corrigir!

---

## 🆚 Validação Local vs IA

| Tipo | O que faz | Quando usar |
|------|-----------|-------------|
| **Validação Local** | Regras básicas (valores não-nulos, tipos corretos) | Sempre ativa (automática) |
| **Auditoria IA** | Valida lógica contábil e matemática | Antes da entrega final |

**Use os dois!** A validação local é rápida, a IA é profunda.

---

## ⚙️ Como funciona por baixo?

1. **Coleta dados:** DRE + amostra de transações
2. **Prompt para DeepSeek:**
   ```
   Você é um auditor financeiro.
   Recalcule:
   - Receita Líquida = R$ 50.000 - R$ 5.000 = ?
   - Lucro Bruto = R$ 45.000 - R$ 20.000 = ?
   
   Compare com os valores fornecidos.
   Retorne JSON com issues encontrados.
   ```
3. **DeepSeek responde:**
   ```json
   {
     "confidence": 100,
     "passed": true,
     "issues": [],
     "summary": "Todos os cálculos corretos"
   }
   ```
4. **UI renderiza** o relatório

---

## 💰 Custo

- **DeepSeek:** R$ 0,0013 por auditoria (~500 tokens)
- **1000 auditorias** = R$ 1,30

(9x mais barato que GPT-4o)

---

## 🔒 Segurança

- ✅ Dados ficam apenas no prompt (não armazenados pela DeepSeek)
- ✅ Fallback offline se API falhar
- ✅ Nunca envia informações pessoais de clientes

---

## 🚀 Próximos Passos

- [ ] Auditoria de Fluxo de Caixa
- [ ] Detecção de fraudes (padrões anormais)
- [ ] Sugestões de otimização fiscal
- [ ] Comparação com benchmarks do setor

---

**Desenvolvido com ❤️ usando DeepSeek V3**
