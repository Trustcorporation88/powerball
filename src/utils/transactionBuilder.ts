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
      // Remove símbolo de moeda e espaços
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
    // Excel serial date - conta a partir de 30/12/1899
    const epoch = new Date(1899, 11, 30);
    const days = rawDate;
    const date = new Date(epoch.getTime() + days * 24 * 60 * 60 * 1000);
    return date.toISOString().split("T")[0];
  }
  
  if (rawDate instanceof Date) {
    return rawDate.toISOString().split("T")[0];
  }
  
  const str = String(rawDate).trim();
  
  // Tenta diversos formatos brasileiros
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  const yyyymmdd = str.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  
  return new Date().toISOString().split("T")[0];
}