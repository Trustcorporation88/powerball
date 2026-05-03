import { Transaction, ColumnMapping } from "@/contexts/AppContext";

export const generateMockTransactions = (): Transaction[] => {
  const categories = ["Vendas", "Marketing", "Operações", "RH", "Tecnologia", "Administrativo", "Impostos"];
  const costCenters = ["Matriz", "Filial SP", "Filial RJ", "Home Office"];
  const accounts = ["Conta Corrente", "Conta Poupança", "Cartão Corporativo"];
  
  const transactions: Transaction[] = [];
  const baseDate = new Date(2024, 0, 1);
  
  for (let i = 0; i < 150; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + Math.floor(Math.random() * 90));
    
    const isIncome = Math.random() > 0.6;
    const value = Math.round((Math.random() * 15000 + 500) * 100) / 100;
    
    transactions.push({
      id: `tx-${i}`,
      date: date.toISOString().split("T")[0],
      description: isIncome ? `Receita ${categories[Math.floor(Math.random() * 3)]}` : `Despesa ${categories[Math.floor(Math.random() * categories.length)]}`,
      category: categories[Math.floor(Math.random() * categories.length)],
      subcategory: `Subcategoria ${Math.floor(Math.random() * 5) + 1}`,
      account: accounts[Math.floor(Math.random() * accounts.length)],
      costCenter: costCenters[Math.floor(Math.random() * costCenters.length)],
      unit: `Unidade ${Math.floor(Math.random() * 3) + 1}`,
      value: isIncome ? value : -value,
      currency: "BRL",
      flowType: isIncome ? "income" : "expense",
    });
  }
  
  return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const generateMockColumnMappings = (): ColumnMapping[] => [
  { originalName: "Data", detectedType: "date", confirmedType: "date", financialRole: "Data do lançamento" },
  { originalName: "Descrição", detectedType: "text", confirmedType: "text", financialRole: "Descrição" },
  { originalName: "Categoria", detectedType: "text", confirmedType: "text", financialRole: "Categoria" },
  { originalName: "Valor", detectedType: "number", confirmedType: "number", financialRole: "Valor" },
  { originalName: "Centro de Custo", detectedType: "text", confirmedType: "text", financialRole: "Centro de custo" },
  { originalName: "Conta", detectedType: "text", confirmedType: "text", financialRole: "Conta" },
  { originalName: "Unidade", detectedType: "text", confirmedType: "text", financialRole: "Unidade" },
];

export const mockPreviewData = [
  { Data: "2024-01-05", Descrição: "Venda de serviços", Categoria: "Vendas", Valor: 12500.00, "Centro de Custo": "Matriz", Conta: "Conta Corrente", Unidade: "Unidade 1" },
  { Data: "2024-01-08", Descrição: "Marketing digital", Categoria: "Marketing", Valor: -3200.50, "Centro de Custo": "Filial SP", Conta: "Cartão Corporativo", Unidade: "Unidade 2" },
  { Data: "2024-01-12", Descrição: "Salários", Categoria: "RH", Valor: -45000.00, "Centro de Custo": "Matriz", Conta: "Conta Corrente", Unidade: "Unidade 1" },
  { Data: "2024-01-15", Descrição: "Venda consultoria", Categoria: "Vendas", Valor: 28000.00, "Centro de Custo": "Filial RJ", Conta: "Conta Poupança", Unidade: "Unidade 3" },
  { Data: "2024-01-18", Descrição: "Servidor cloud", Categoria: "Tecnologia", Valor: -1890.00, "Centro de Custo": "Home Office", Conta: "Cartão Corporativo", Unidade: "Unidade 2" },
  { Data: "2024-01-22", Descrição: "Aluguel", Categoria: "Administrativo", Valor: -8500.00, "Centro de Custo": "Matriz", Conta: "Conta Corrente", Unidade: "Unidade 1" },
  { Data: "2024-01-25", Descrição: "Venda produtos", Categoria: "Vendas", Valor: 15600.00, "Centro de Custo": "Filial SP", Conta: "Conta Corrente", Unidade: "Unidade 2" },
  { Data: "2024-01-28", Descrição: "Impostos", Categoria: "Impostos", Valor: -4200.00, "Centro de Custo": "Matriz", Conta: "Conta Corrente", Unidade: "Unidade 1" },
];