import { Transaction, ColumnMapping } from "@/contexts/AppContext";
import { inferDREGroup } from "@/services/dre";

export const generateMockTransactions = (): Transaction[] => {
  const costCenters = ["Matriz", "Filial SP", "Filial RJ", "Home Office"];
  const accounts = ["Conta Corrente", "Conta Poupança", "Cartão Corporativo"];
  const incomeProfiles = [
    { category: "Vendas", subcategory: "Receita Recorrente", description: "Receita de vendas" },
    { category: "Serviços", subcategory: "Consultoria", description: "Receita de serviços" },
    { category: "Receita Financeira", subcategory: "Rendimento", description: "Rendimento financeiro" },
  ];
  const expenseProfiles = [
    { category: "Tributos sobre Vendas", subcategory: "Impostos sobre Faturamento", description: "Tributos sobre vendas" },
    { category: "Operações", subcategory: "Custo Variável", description: "Custo operacional" },
    { category: "Marketing", subcategory: "Campanhas", description: "Despesa de marketing" },
    { category: "RH", subcategory: "Folha", description: "Despesa de pessoal" },
    { category: "Tecnologia", subcategory: "Infraestrutura", description: "Despesa de tecnologia" },
    { category: "Administrativo", subcategory: "Backoffice", description: "Despesa administrativa" },
    { category: "Impostos", subcategory: "Tributos sobre Lucro", description: "Impostos sobre resultado" },
  ];
  
  const transactions: Transaction[] = [];
  const baseDate = new Date(2024, 0, 1);
  
  for (let i = 0; i < 150; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + Math.floor(Math.random() * 90));
    
    const isIncome = Math.random() > 0.6;
    const value = Math.round((Math.random() * 15000 + 500) * 100) / 100;
    const profile = isIncome
      ? incomeProfiles[Math.floor(Math.random() * incomeProfiles.length)]
      : expenseProfiles[Math.floor(Math.random() * expenseProfiles.length)];
    const flowType = isIncome ? "income" : "expense";
    const signedValue = isIncome ? value : -value;
    
    transactions.push({
      id: `tx-${i}`,
      date: date.toISOString().split("T")[0],
      description: `${profile.description} ${Math.floor(Math.random() * 20) + 1}`,
      category: profile.category,
      dreGroup: inferDREGroup({
        category: profile.category,
        subcategory: profile.subcategory,
        description: profile.description,
        account: accounts[Math.floor(Math.random() * accounts.length)],
        flowType,
      }),
      subcategory: profile.subcategory,
      account: accounts[Math.floor(Math.random() * accounts.length)],
      costCenter: costCenters[Math.floor(Math.random() * costCenters.length)],
      unit: `Unidade ${Math.floor(Math.random() * 3) + 1}`,
      value: signedValue,
      currency: "BRL",
      flowType,
    });
  }
  
  return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const generateMockColumnMappings = (): ColumnMapping[] => [
  { originalName: "Data", detectedType: "date", confirmedType: "date", financialRole: "Data do lançamento" },
  { originalName: "Descrição", detectedType: "text", confirmedType: "text", financialRole: "Descrição" },
  { originalName: "Categoria", detectedType: "text", confirmedType: "text", financialRole: "Categoria" },
  { originalName: "Grupo DRE", detectedType: "text", confirmedType: "text", financialRole: "Grupo DRE" },
  { originalName: "Valor", detectedType: "number", confirmedType: "number", financialRole: "Valor" },
  { originalName: "Centro de Custo", detectedType: "text", confirmedType: "text", financialRole: "Centro de custo" },
  { originalName: "Conta", detectedType: "text", confirmedType: "text", financialRole: "Conta" },
  { originalName: "Unidade", detectedType: "text", confirmedType: "text", financialRole: "Unidade" },
];

export const mockPreviewData = [
  { Data: "2024-01-05", Descrição: "Venda de serviços", Categoria: "Vendas", "Grupo DRE": "Receita Bruta", Valor: 12500.00, "Centro de Custo": "Matriz", Conta: "Conta Corrente", Unidade: "Unidade 1" },
  { Data: "2024-01-08", Descrição: "Tributos sobre vendas", Categoria: "Tributos sobre Vendas", "Grupo DRE": "Deduções", Valor: -3200.50, "Centro de Custo": "Filial SP", Conta: "Cartão Corporativo", Unidade: "Unidade 2" },
  { Data: "2024-01-12", Descrição: "Salários", Categoria: "RH", "Grupo DRE": "Despesas Operacionais", Valor: -45000.00, "Centro de Custo": "Matriz", Conta: "Conta Corrente", Unidade: "Unidade 1" },
  { Data: "2024-01-15", Descrição: "Venda consultoria", Categoria: "Serviços", "Grupo DRE": "Receita Bruta", Valor: 28000.00, "Centro de Custo": "Filial RJ", Conta: "Conta Poupança", Unidade: "Unidade 3" },
  { Data: "2024-01-18", Descrição: "Servidor cloud", Categoria: "Tecnologia", "Grupo DRE": "Despesas Operacionais", Valor: -1890.00, "Centro de Custo": "Home Office", Conta: "Cartão Corporativo", Unidade: "Unidade 2" },
  { Data: "2024-01-22", Descrição: "Frete operacional", Categoria: "Operações", "Grupo DRE": "Custos", Valor: -8500.00, "Centro de Custo": "Matriz", Conta: "Conta Corrente", Unidade: "Unidade 1" },
  { Data: "2024-01-25", Descrição: "Venda produtos", Categoria: "Vendas", "Grupo DRE": "Receita Bruta", Valor: 15600.00, "Centro de Custo": "Filial SP", Conta: "Conta Corrente", Unidade: "Unidade 2" },
  { Data: "2024-01-28", Descrição: "IRPJ e CSLL", Categoria: "Impostos", "Grupo DRE": "Impostos", Valor: -4200.00, "Centro de Custo": "Matriz", Conta: "Conta Corrente", Unidade: "Unidade 1" },
];
