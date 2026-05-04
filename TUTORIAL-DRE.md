# 📊 TUTORIAL COMPLETO: Como Gerar DRE no Sistema

## 🎯 O que é DRE?

**DRE (Demonstração do Resultado do Exercício)** é um relatório financeiro que mostra se sua empresa teve **lucro ou prejuízo** em um período.

### 📅 Tipos de DRE no Sistema

O sistema permite gerar **3 tipos de DRE**:

| Tipo | O que mostra | Quando usar |
|------|--------------|-------------|
| **DRE MENSAL** 📆 | Resultado **apenas do mês** selecionado | Ver performance de Janeiro, Fevereiro, etc |
| **DRE TRIMESTRAL** 📊 | Resultado **acumulado do trimestre** (3 meses) | Análise trimestral (T1, T2, T3, T4) |
| **DRE ANUAL** 📈 | Resultado **acumulado do ano inteiro** | Fechamento anual, balanço fiscal |

**Exemplo prático:**
- **DRE Mensal (Janeiro/2024):** Soma transações de 01/01/2024 a 31/01/2024
- **DRE Trimestral (T1/2024):** Soma transações de 01/01/2024 a 31/03/2024
- **DRE Anual (2024):** Soma transações de 01/01/2024 a 31/12/2024

### 📐 Estrutura do DRE

```
Receita Bruta (vendas do período)
(-) Deduções (impostos sobre vendas)
= Receita Líquida
(-) Custos (CMV, CPV)
= Lucro Bruto
(-) Despesas Operacionais
= EBITDA
(-) Resultado Financeiro (se negativo)
= Resultado antes dos Impostos
(-) Impostos sobre Lucro
= Resultado Líquido (Lucro/Prejuízo)
```

**⚠️ IMPORTANTE:** Cada linha do DRE soma **apenas as transações do período selecionado**!

---

## 📋 DADOS NECESSÁRIOS

Para gerar o DRE, você precisa **transações financeiras** com os seguintes campos:

### ✅ Campos Obrigatórios

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Data** | Data da transação | `2024-01-15` |
| **Descrição** | O que foi pago/recebido | `Venda de consultoria` |
| **Categoria** | Tipo de receita/despesa | `Vendas`, `Marketing`, `RH` |
| **Valor** | Valor em R$ | `15000.00` (positivo = receita, negativo = despesa) |
| **Tipo de Fluxo** | `income` ou `expense` | `income` |

### 🎨 Campos Opcionais (mas recomendados)

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Subcategoria** | Detalhamento | `Consultoria`, `Folha de Pagamento` |
| **Centro de Custo** | Departamento/Filial | `Matriz`, `Filial SP` |
| **Conta** | Conta bancária | `Conta Corrente`, `Cartão Corporativo` |
| **Unidade** | Unidade de negócio | `Unidade 1` |

---

## 🗂️ CATEGORIAS E GRUPOS DRE

O sistema classifica automaticamente as transações nos **7 grupos do DRE**.

**📊 Como funciona:**
- **DRE Mensal (jan/2024):** Soma apenas transações de janeiro
- **DRE Anual (2024):** Soma transações de janeiro + fevereiro + ... + dezembro

Cada grupo abaixo mostra **exemplos práticos** de como inserir os dados:

---

### 1️⃣ **Receita Bruta** 💰
Todas as vendas e receitas principais do negócio **no período selecionado**.

**Categorias que entram aqui:**
- `Vendas`
- `Serviços`
- `Receita de Produtos`
- `Faturamento`
- `Consultoria`

**Exemplos de lançamento:**
```
Data: 2024-01-15
Descrição: Venda de consultoria para Cliente XYZ
Categoria: Serviços
Subcategoria: Consultoria
Valor: +15000.00
Tipo: income
```

**Como aparece no DRE:**
- **DRE Janeiro:** R$ 15.000,00 (apenas essa venda)
- **DRE Anual:** R$ 15.000,00 + todas as outras vendas do ano

---

### 2️⃣ **Deduções** ⚖️
Impostos sobre vendas, devoluções, descontos concedidos.

**Categorias que entram aqui:**
- `Tributos sobre Vendas`
- `Impostos sobre Faturamento`
- `PIS/COFINS`
- `ISS`
- `ICMS`
- `Devoluções`
- `Descontos Concedidos`
- `Comissões sobre Vendas`

**Exemplos de lançamento:**
```
Data: 2024-01-15
Descrição: PIS/COFINS sobre vendas
Categoria: Tributos sobre Vendas
Subcategoria: PIS/COFINS
Valor: -1395.00
Tipo: expense
```

---

### 3️⃣ **Custos** 🏭
Custos diretos de produção/prestação de serviço (CMV/CPV).

**Categorias que entram aqui:**
- `CMV` (Custo de Mercadoria Vendida)
- `CPV` (Custo do Produto Vendido)
- `Operações`
- `Produção`
- `Matéria-Prima`
- `Insumos`
- `Frete sobre Compras`
- `Serviços Prestados`

**Exemplos de lançamento:**
```
Data: 2024-01-10
Descrição: Compra de matéria-prima para produção
Categoria: Operações
Subcategoria: Matéria-Prima
Valor: -8500.00
Tipo: expense
```

---

### 4️⃣ **Despesas Operacionais** 💼
Despesas para manter a empresa funcionando (não ligadas diretamente à produção).

**Categorias que entram aqui:**
- `RH` / `Folha de Pagamento`
- `Marketing` / `Publicidade`
- `Tecnologia` / `TI`
- `Administrativo`
- `Aluguel`
- `Energia`
- `Telefone`
- `Contabilidade`
- `Jurídico`

**Exemplos de lançamento:**
```
Data: 2024-01-05
Descrição: Salários janeiro/2024
Categoria: RH
Subcategoria: Folha de Pagamento
Valor: -45000.00
Tipo: expense

Data: 2024-01-08
Descrição: Anúncios Google Ads
Categoria: Marketing
Subcategoria: Publicidade Online
Valor: -3200.00
Tipo: expense
```

---

### 5️⃣ **Resultado Financeiro** 📈
Receitas e despesas financeiras (juros, rendimentos, tarifas bancárias).

**Categorias que entram aqui:**
- `Receita Financeira` (rendimentos, juros recebidos)
- `Despesas Financeiras` (juros pagos, IOF, tarifas bancárias)
- `Rendimentos`
- `Aplicações`

**Exemplos de lançamento:**
```
Data: 2024-01-31
Descrição: Rendimento conta poupança
Categoria: Receita Financeira
Subcategoria: Rendimentos
Valor: +125.50
Tipo: income

Data: 2024-01-20
Descrição: Juros de financiamento
Categoria: Despesas Financeiras
Subcategory: Juros
Valor: -890.00
Tipo: expense
```

---

### 6️⃣ **Impostos** 🏛️
Impostos sobre o lucro (IRPJ, CSLL).

**Categorias que entram aqui:**
- `Impostos sobre Lucro`
- `IRPJ`
- `CSLL`
- `Imposto de Renda`

**Exemplos de lançamento:**
```
Data: 2024-01-31
Descrição: IRPJ e CSLL jan/2024
Categoria: Impostos
Subcategoria: IRPJ/CSLL
Valor: -2500.00
Tipo: expense
```

---

### 7️⃣ **Outros Resultados** 🎲
Receitas/despesas não operacionais (venda de ativo, multas, etc).

**Categorias que entram aqui:**
- `Não Operacional`
- `Ganho Eventual`
- `Venda de Ativo`
- `Multas Recebidas`

**Exemplos de lançamento:**
```
Data: 2024-01-25
Descrição: Venda de equipamento usado
Categoria: Outros Resultados
Subcategoria: Venda de Ativo
Valor: +5000.00
Tipo: income
```

---

## 📊 EXEMPLO VISUAL: DRE Mensal vs Anual

### **Cenário: Empresa com 3 meses de dados**

**Transações lançadas:**

| Mês | Categoria | Valor |
|-----|-----------|-------|
| Janeiro | Vendas | R$ 50.000 |
| Janeiro | Tributos sobre Vendas | -R$ 4.650 |
| Janeiro | Custos | -R$ 20.000 |
| Janeiro | Despesas Operacionais | -R$ 15.000 |
| **Fevereiro** | Vendas | R$ 60.000 |
| **Fevereiro** | Tributos sobre Vendas | -R$ 5.580 |
| **Fevereiro** | Custos | -R$ 24.000 |
| **Fevereiro** | Despesas Operacionais | -R$ 15.000 |
| **Março** | Vendas | R$ 55.000 |
| **Março** | Tributos sobre Vendas | -R$ 5.115 |
| **Março** | Custos | -R$ 22.000 |
| **Março** | Despesas Operacionais | -R$ 15.000 |

---

### **DRE MENSAL - Janeiro/2024**
```
┌─────────────────────────────────────┬─────────────┐
│ JANEIRO/2024                        │    VALOR    │
├─────────────────────────────────────┼─────────────┤
│ Receita Bruta                       │  R$ 50.000  │
│ (-) Deduções                        │  -R$ 4.650  │
│ = Receita Líquida                   │  R$ 45.350  │
│ (-) Custos                          │ -R$ 20.000  │
│ = Lucro Bruto                       │  R$ 25.350  │
│ (-) Despesas Operacionais           │ -R$ 15.000  │
│ = EBITDA                            │  R$ 10.350  │
│ = Resultado Líquido                 │  R$ 10.350  │
└─────────────────────────────────────┴─────────────┘
```

### **DRE TRIMESTRAL - T1/2024 (Jan+Fev+Mar)**
```
┌─────────────────────────────────────┬─────────────┐
│ T1/2024 (JAN+FEV+MAR)               │    VALOR    │
├─────────────────────────────────────┼─────────────┤
│ Receita Bruta                       │ R$ 165.000  │
│ (-) Deduções                        │ -R$ 15.345  │
│ = Receita Líquida                   │ R$ 149.655  │
│ (-) Custos                          │ -R$ 66.000  │
│ = Lucro Bruto                       │  R$ 83.655  │
│ (-) Despesas Operacionais           │ -R$ 45.000  │
│ = EBITDA                            │  R$ 38.655  │
│ = Resultado Líquido                 │  R$ 38.655  │
└─────────────────────────────────────┴─────────────┘
```

### **DRE ANUAL - 2024 (12 meses)**
```
┌─────────────────────────────────────┬─────────────┐
│ ANUAL 2024 (12 MESES)               │    VALOR    │
├─────────────────────────────────────┼─────────────┤
│ Receita Bruta                       │ R$ 660.000  │
│ (-) Deduções                        │ -R$ 61.380  │
│ = Receita Líquida                   │ R$ 598.620  │
│ (-) Custos                          │-R$ 264.000  │
│ = Lucro Bruto                       │ R$ 334.620  │
│ (-) Despesas Operacionais           │-R$ 180.000  │
│ = EBITDA                            │ R$ 154.620  │
│ = Resultado Líquido                 │ R$ 154.620  │
└─────────────────────────────────────┴─────────────┘
```

**💡 Observações importantes:**

1. **DRE Mensal** mostra apenas o **mês específico**
2. **DRE Trimestral** soma **3 meses consecutivos**
3. **DRE Anual** soma **todos os 12 meses do ano**
4. Cada tipo responde perguntas diferentes:
   - Mensal: "Como foi janeiro?"
   - Trimestral: "Como foi o primeiro trimestre?"
   - Anual: "Quanto lucrei no ano?"

---

## 🚀 PASSO A PASSO: Como Inserir Dados

### **Opção 1: Importar Planilha Excel/CSV**

1. Acesse **Menu → Novo Projeto**
2. Clique em **"Carregar Arquivo"**
3. Selecione arquivo `.xlsx` ou `.csv`
4. O sistema irá:
   - Detectar as colunas automaticamente
   - Pedir confirmação do mapeamento
   - Classificar automaticamente as categorias DRE
5. Revise a classificação e ajuste se necessário
6. Clique em **"Salvar Projeto"**

**Formato recomendado da planilha:**

| Data | Descrição | Categoria | Valor | Tipo |
|------|-----------|-----------|-------|------|
| 2024-01-15 | Venda consultoria | Serviços | 15000 | income |
| 2024-01-15 | PIS/COFINS | Tributos sobre Vendas | -1395 | expense |
| 2024-01-10 | Matéria-prima | Operações | -8500 | expense |
| 2024-01-05 | Salários | RH | -45000 | expense |

---

### **Opção 2: Gerar Dados de Demonstração**

1. Acesse **Dashboard**
2. Clique no botão **"Gerar Dados de Demonstração"** (ícone 🗄️)
3. Será criado um projeto com **150 transações fictícias** prontas para testar o DRE

---

## 📊 Como Gerar o DRE

1. Acesse **Menu → DRE**
2. Selecione o **período** (mês, trimestre ou ano)
3. O sistema irá:
   - Agrupar transações pelos **7 grupos DRE**
   - Calcular automaticamente:
     - **Receita Líquida** = Receita Bruta - Deduções
     - **Lucro Bruto** = Receita Líquida - Custos
     - **EBITDA** = Lucro Bruto - Despesas Operacionais
     - **Resultado Líquido** = EBITDA + Resultado Financeiro - Impostos
4. Visualize:
   - **4 cartões principais** com indicadores-chave
   - **Tabela DRE** com valores detalhados
   - **Gráfico de evolução** mensal
   - **Análise vertical** (% sobre receita)

---

## 🎯 EBITDA: O Indicador Mais Importante

### **O que é EBITDA?**

**EBITDA** = **E**arnings **B**efore **I**nterest, **T**axes, **D**epreciation and **A**mortization

Em português: **LAJIDA** = **L**ucro **A**ntes de **J**uros, **I**mpostos, **D**epreciação e **A**mortização

**Por que é importante?**
- Mostra a **capacidade operacional pura** do negócio
- Ignora efeitos financeiros (juros), fiscais (impostos) e contábeis (depreciação)
- Permite **comparar empresas** de diferentes setores e estruturas de capital
- Indicador #1 usado por **investidores e bancos**

### **Como é calculado:**

```
Receita Bruta
(-) Deduções (impostos sobre vendas)
= Receita Líquida
(-) Custos (CMV/CPV)
= Lucro Bruto
(-) Despesas Operacionais (salários, marketing, etc)
= ✨ EBITDA ✨
```

### **Interpretação:**

| EBITDA | Significado |
|--------|-------------|
| **Positivo** 📈 | Negócio **lucrativo** antes de juros/impostos |
| **Negativo** 📉 | Negócio **prejuízo operacional** (receita não cobre custos+despesas) |
| **Zero** ⚖️ | Receita cobre exatamente custos e despesas |

### **Margem EBITDA:**

**Margem EBITDA (%)** = (EBITDA / Receita Líquida) × 100

| Margem | Qualidade |
|--------|-----------|
| **> 20%** 🟢 | Excelente |
| **10-20%** 🟡 | Bom |
| **0-10%** 🟠 | Razoável |
| **< 0%** 🔴 | Prejuízo operacional |

**Exemplo:**
- Receita Líquida: R$ 100.000
- EBITDA: R$ 25.000
- **Margem EBITDA: 25%** (excelente!)

### **No Sistema:**

O cartão **EBITDA** mostra:
1. **Valor absoluto** (R$ 25.000)
2. **Margem %** (25% badge superior)
3. **Comparação** com período anterior
4. **Legenda** "Earnings Before Interest, Taxes..."

---

## ⚠️ VALIDAÇÕES AUTOMÁTICAS

O sistema valida automaticamente:

✅ **Formulas corretas do DRE:**
- Receita Líquida = Receita Bruta - Deduções
- Lucro Bruto = Receita Líquida - Custos
- EBITDA = Lucro Bruto - Despesas Operacionais
- Resultado Líquido = EBITDA + Resultado Financeiro - Impostos

✅ **Classificação de categorias:**
- Valida se cada transação está no grupo DRE correto
- Sugere reclassificação se detectar erro

✅ **Dados incompletos:**
- Alerta se faltam campos obrigatórios
- Mostra transações sem categoria

---

## 🤖 AUDITORIA COM IA (DeepSeek)

O sistema possui **auditoria inteligente** que verifica:

1. **Cálculos do DRE** (precisão de R$ 0,01)
2. **Classificação de transações** (valida 15 amostras aleatórias)
3. **Sugestões de correção** automáticas

**Como usar:**
1. Acesse **DRE**
2. Clique em **"Auditar com IA"** ⚡
3. Aguarde análise (15-30 segundos)
4. Veja relatório com:
   - ✅ **Info:** Validações OK
   - ⚠️ **Avisos:** Sugestões de melhoria
   - 🚨 **Crítico:** Erros que impedem entrega

---

## 🎯 DICAS PRÁTICAS

### ✅ **Boas Práticas**

1. **Use categorias consistentes**
   - Sempre use os mesmos nomes (ex: "RH", não "Recursos Humanos" e "RH")

2. **Separe tributos sobre vendas dos tributos sobre lucro**
   - Tributos sobre vendas → `Deduções`
   - Tributos sobre lucro → `Impostos`

3. **Diferencie custos de despesas**
   - Custos → Ligados à produção/venda
   - Despesas → Ligados à administração

4. **Use valores com sinal correto**
   - Receitas → **positivo** (+15000)
   - Despesas → **negativo** (-8500)

5. **Configure regras DRE personalizadas**
   - Acesse **DRE → Configurar Regras**
   - Crie regras automáticas de classificação

---

### ❌ **Erros Comuns**

| Erro | Problema | Solução |
|------|----------|---------|
| DRE vazio | Sem transações no período | Verifique filtro de data |
| Valores zerados | Transações sem categoria | Categorize todas as transações |
| Lucro Bruto negativo | Custos > Receita Líquida | Revise classificação de custos |
| IRPJ em deduções | Classificação errada | IRPJ deve estar em "Impostos", não "Deduções" |

---

## 🌟 RECURSOS AVANÇADOS

### **1. Comparação com Benchmarks (B3)**
Compare seu DRE com empresas públicas do mesmo setor.

**Como usar:**
1. Acesse **DRE**
2. Clique em **"Comparar com B3"** 📊
3. Selecione setor (ex: Varejo, Tecnologia)
4. Veja indicadores:
   - Margem Bruta
   - Margem EBITDA
   - Margem Líquida

### **2. Validação CNPJ/Receita Federal**
Valide dados cadastrais do cliente.

**Como usar:**
1. Acesse **Novo Projeto**
2. Clique em **"Validar CNPJ"** 🔍
3. Digite CNPJ (auto-formatado)
4. Veja dados da Receita Federal

### **3. Exportar DRE**
- **Excel:** Tabela completa editável
- **PDF:** Relatório profissional
- **PowerPoint:** Apresentação executiva

---

## 📞 PRECISA DE AJUDA?

**Documentação adicional:**
- `AUDITOR-IA.md` → Auditoria com DeepSeek
- `README.md` → Visão geral do sistema

**Suporte:**
- Email: financas@trustcorp.com.br
- Dashboard: Botão "Perguntar à IA" (⚡ DeepSeek)

---

## 📝 CHECKLIST FINAL

Antes de gerar o DRE, verifique:

- [ ] Todas as transações têm **data, descrição, categoria e valor**
- [ ] Valores de **receita são positivos**, despesas são **negativas**
- [ ] **Tributos sobre vendas** estão em "Deduções"
- [ ] **CMV/CPV** estão em "Custos"
- [ ] **RH, Marketing, TI** estão em "Despesas Operacionais"
- [ ] **IRPJ/CSLL** estão em "Impostos"
- [ ] Período selecionado está **correto**
- [ ] Rodou **auditoria com IA** para validar

---

**🎉 Pronto! Agora você está preparado para gerar DREs profissionais!**
