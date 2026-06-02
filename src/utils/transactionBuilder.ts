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
  const categoryFallbackColumns = Object.keys(sheet.data[0] ?? {}).filter((key) => {
    const normalized = key
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

    return (
      normalized.includes("categoria") ||
      normalized.includes("tipo") ||
      normalized.includes("classe") ||
      normalized.includes("grupo") ||
      normalized.includes("natureza")
    );
  });

  sheet.data.forEach((row, index) => {
    const rawValue = valueCol ? row[valueCol] : 0;
    let value = 0;
    if (typeof rawValue === "number") {
      value = rawValue;
    } else if (typeof rawValue === "string") {
      const isNegativeWithParenthesis = rawValue.includes("(") && rawValue.includes(")");
      const cleaned = rawValue
        .replace(/[R$\s]/g, "")
        .replace(/[()]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      value = parseFloat(cleaned) || 0;
      if (isNegativeWithParenthesis) {
        value = -Math.abs(value);
      }
    }

    const date = dateCol ? parseDate(row[dateCol]) : new Date().toISOString().split("T")[0];

    // Extrai categoria por mapeamento ou por colunas semanticamente prováveis.
    let category = catCol ? String(row[catCol] || "") : "";
    if (!category) {
      for (const key of categoryFallbackColumns) {
        const val = String(row[key] || "");
        if (val.length > 0) {
          category = val;
          break;
        }
      }
    }
    if (!category) category = "Não classificado";

    // Extrai centro de custo
    let costCenter = ccCol ? String(row[ccCol] || "") : "";
    if (!costCenter) costCenter = "Geral";

    transactions.push({
      id: `tx-${index}`,
      date,
      description: descCol ? String(row[descCol] || "") : `Lançamento ${index + 1}`,
      category,
      subcategory: subcatCol ? String(row[subcatCol] || "") : "",
      account: accountCol ? String(row[accountCol] || "") : "",
      costCenter,
      unit: unitCol ? String(row[unitCol] || "") : "",
      value,
      currency: currencyCol ? String(row[currencyCol] || "") : "BRL",
      flowType: value >= 0 ? "income" : "expense",
    });
  });

  return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function parseDate(rawDate: unknown): string {
  if (!rawDate) return new Date().toISOString().split("T")[0];
  
  if (typeof rawDate === "number") {
    const epoch = new Date(1899, 11, 30);
    const days = rawDate;
    const date = new Date(epoch.getTime() + days * 24 * 60 * 60 * 1000);
    return date.toISOString().split("T")[0];
  }
  
  if (rawDate instanceof Date) {
    return rawDate.toISOString().split("T")[0];
  }
  
  const str = String(rawDate).trim();
  
  const ddmmyyyy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  const yyyymmdd = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
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