import { ParsedSheet, ColumnMapping, Transaction } from "@/contexts/AppContext";

function sanitizeName(value: any, fallback: string): string {
  const str = String(value || "").trim();
  if (!str) return fallback;
  // Se for apenas um numero (positivo, negativo, decimal), usa fallback
  if (/^-?\d+([.,]\d+)?$/.test(str.replace(/\s/g, ""))) return fallback;
  return str;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

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
      const cleaned = rawValue
        .replace(/[R$\s]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      value = parseFloat(cleaned) || 0;
    }

    const date = dateCol ? parseDate(row[dateCol]) : new Date().toISOString().split("T")[0];

    let category = sanitizeName(catCol ? row[catCol] : null, "");
    if (!category) {
      // Tenta encontrar categoria em outras colunas de texto
      for (const key of Object.keys(row)) {
        const val = String(row[key] || "");
        if (val.length > 0 && val.length < 50 && !val.match(/^-?\d/)) {
          category = val;
          break;
        }
      }
    }
    if (!category) category = "Não classificado";

    let costCenter = sanitizeName(ccCol ? row[ccCol] : null, "");
    if (!costCenter) costCenter = "Geral";

    let description = sanitizeName(descCol ? row[descCol] : null, `Lançamento ${index + 1}`);

    transactions.push({
      id: `tx-${index}`,
      date,
      description,
      category,
      subcategory: sanitizeName(subcatCol ? row[subcatCol] : null, ""),
      account: sanitizeName(accountCol ? row[accountCol] : null, ""),
      costCenter,
      unit: sanitizeName(unitCol ? row[unitCol] : null, ""),
      value: round2(value),
      currency: sanitizeName(currencyCol ? row[currencyCol] : null, "BRL"),
      flowType: value >= 0 ? "income" : "expense",
    });
  });

  return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function parseDate(rawDate: any): string {
  if (!rawDate) return new Date().toISOString().split("T")[0];
  
  if (rawDate instanceof Date) {
    return rawDate.toISOString().split("T")[0];
  }
  
  if (typeof rawDate === "number") {
    // Excel serial date: 1 = 1900-01-01 (com bug de 1900), ou epoch 1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + rawDate * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }
  
  const str = String(rawDate).trim();
  
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