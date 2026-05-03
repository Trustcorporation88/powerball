import { ParsedSheet, ColumnMapping, Transaction } from "@/contexts/AppContext";

export function buildTransactionsFromSheet(
  sheet: ParsedSheet,
  mappings: ColumnMapping[]
): Transaction[] {
  const fieldMap: Record<string, string> = {};
  
  mappings.forEach((m) => {
    if (m.financialRole !== "Nenhum") {
      fieldMap[m.financialRole] = m.originalName;
    }
  });

  const dateCol = fieldMap["Data do lançamento"];
  const descCol = fieldMap["Descrição"];
  const catCol = fieldMap["Categoria"];
  const subcatCol = fieldMap["Subcategoria"];
  const valueCol = fieldMap["Valor"];
  const ccCol = fieldMap["Centro de custo"];
  const accountCol = fieldMap["Conta"];
  const unitCol = fieldMap["Unidade"];
  const currencyCol = fieldMap["Moeda"];

  const transactions: Transaction[] = [];

  sheet.data.forEach((row, index) => {
    let rawValue = valueCol ? row[valueCol] : 0;
    let value = 0;

    if (typeof rawValue === "number") {
      value = rawValue;
    } else if (typeof rawValue === "string") {
      // Remove símbolo de moeda, pontos de milhar e substitui vírgula por ponto
      const cleaned = rawValue
        .replace(/[R$\s]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      value = parseFloat(cleaned) || 0;
    }

    const date = dateCol ? parseDate(row[dateCol]) : new Date().toISOString().split("T")[0];

    transactions.push({
      id: `tx-${index}`,
      date,
      description: descCol ? String(row[descCol] || "") : `Lançamento ${index + 1}`,
      category: catCol ? String(row[catCol] || "Não classificado") : "Não classificado",
      subcategory: subcatCol ? String(row[subcatCol] || "") : "",
      account: accountCol ? String(row[accountCol] || "") : "",
      costCenter: ccCol ? String(row[ccCol] || "") : "Geral",
      unit: unitCol ? String(row[unitCol] || "") : "",
      value,
      currency: currencyCol ? String(row[currencyCol] || "") : "BRL",
      flowType: value >= 0 ? "income" : "expense",
    });
  });

  return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function parseDate(rawDate: any): string {
  if (!rawDate) return new Date().toISOString().split("T")[0];
  
  if (typeof rawDate === "number") {
    // Excel serial date
    const epoch = new Date(1899, 11, 30);
    const days = rawDate;
    const date = new Date(epoch.getTime() + days * 24 * 60 * 60 * 1000);
    return date.toISOString().split("T")[0];
  }
  
  if (rawDate instanceof Date) {
    return rawDate.toISOString().split("T")[0];
  }
  
  const str = String(rawDate);
  
  // Tenta diversos formatos
  const formats = [
    /(\d{2})\/(\d{2})\/(\d{4})/,  // DD/MM/YYYY
    /(\d{2})-(\d{2})-(\d{4})/,      // DD-MM-YYYY
    /(\d{4})-(\d{2})-(\d{2})/,       // YYYY-MM-DD
  ];
  
  for (const format of formats) {
    const match = str.match(format);
    if (match) {
      if (format.toString().includes("\\d{4})-")) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
  }
  
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  
  return new Date().toISOString().split("T")[0];
}