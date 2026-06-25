import type { ColumnMapping, Transaction } from "@/contexts/AppContext";
import type { ParsedSheet } from "@/utils/excelParser";
import { resolveTransactionDREClassification } from "@/services/dre";
import type { DREClassificationRule } from "@/services/dreRules";

export interface BuildStats {
  totalRows: number;
  processedRows: number;
  skippedRows: number;
  totalValue: number;
  invalidValues: number;
  dateRange: { min: string | null; max: string | null };
  categoriesFound: string[];
  costCentersFound: string[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Parse robusto de valores monetários
 * Lida com: 1234,56 | 1.234,56 | R$ 1.234,56 | -1500 | (1.200,00) etc
 */
export function parseNumericValue(raw: any): { value: number; valid: boolean } {
  if (raw === undefined || raw === null || raw === "") {
    return { value: 0, valid: false };
  }

  if (typeof raw === "number") {
    if (isNaN(raw)) return { value: 0, valid: false };
    return { value: raw, valid: true };
  }

  let str = String(raw).trim();
  if (!str) return { value: 0, valid: false };

  // Parenteses indicam negativo em contabilidade: (1.200,00) = -1200,00
  const isNegative = str.startsWith("(") && str.endsWith(")");
  if (isNegative) {
    str = str.slice(1, -1);
  }

  // Remove simbolos de moeda e espacos
  str = str.replace(/[R$\s]/g, "");

  if (!str) return { value: 0, valid: false };

  const hasComma = str.includes(",");
  const hasDot = str.includes(".");

  let numericStr: string;

  if (hasComma && hasDot) {
    // 1.234,56 (BRL) vs 1,234.56 (US)
    const lastComma = str.lastIndexOf(",");
    const lastDot = str.lastIndexOf(".");
    if (lastComma > lastDot) {
      // BRL: ponto = milhar, virgula = decimal
      numericStr = str.replace(/\./g, "").replace(",", ".");
    } else {
      // US: virgula = milhar, ponto = decimal
      numericStr = str.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = str.split(",");
    if (parts.length === 2 && parts[1].length <= 2 && parts[0].length > 0) {
      // 1234,56 ou 1,2 (provavel decimal)
      numericStr = str.replace(",", ".");
    } else {
      // 1,234,567 (milhar) ou invalido
      numericStr = str.replace(/,/g, "");
    }
  } else if (hasDot) {
    const parts = str.split(".");
    if (parts.length === 2 && parts[1].length <= 2 && parts[0].length >= 1) {
      // Pode ser 1234.56 (decimal) ou 1.234 (milhar sem decimal)
      // Se parte inteira tem ate 3 digitos e decimal tem 1-2, provavel decimal
      numericStr = str;
    } else if (parts.length > 2) {
      // Multiplos pontos = milhar
      numericStr = str.replace(/\./g, "");
    } else {
      numericStr = str;
    }
  } else {
    numericStr = str;
  }

  const parsed = parseFloat(numericStr);
  if (isNaN(parsed)) return { value: 0, valid: false };

  const finalValue = isNegative ? -Math.abs(parsed) : parsed;
  return { value: finalValue, valid: true };
}

function parseDate(rawDate: any): string | null {
  if (!rawDate) return null;

  if (rawDate instanceof Date) {
    if (isNaN(rawDate.getTime())) return null;
    return rawDate.toISOString().split("T")[0];
  }

  if (typeof rawDate === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + rawDate * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
      return date.toISOString().split("T")[0];
    }
  }

  const str = String(rawDate).trim();

  // dd/mm/yyyy ou dd-mm-yyyy
  const ddmmyyyy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // yyyy/mm/dd
  const yyyymmdd = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // dd/mm/yy
  const ddmmyy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
  if (ddmmyy) {
    const [, day, month, yearStr] = ddmmyy;
    const year = parseInt(yearStr);
    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

function cleanText(value: any, fallback: string): string {
  const str = String(value ?? "").trim();
  if (!str) return fallback;
  return str;
}

export function buildTransactionsFromSheet(
  sheet: ParsedSheet,
  mappings: ColumnMapping[],
  dreRules: DREClassificationRule[] = [],
): { transactions: Transaction[]; stats: BuildStats } {
  const fieldMap: Record<string, string> = {};

  mappings.forEach((m) => {
    if (m.financialRole !== "Nenhum" && m.originalName) {
      fieldMap[m.financialRole] = m.originalName.trim();
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
  const dreGroupCol = fieldMap["Grupo DRE"];

  const transactions: Transaction[] = [];
  const categoriesFound = new Set<string>();
  const costCentersFound = new Set<string>();
  let totalValue = 0;
  let invalidValues = 0;
  let minDate: string | null = null;
  let maxDate: string | null = null;
  let skippedRows = 0;

  if (!valueCol) {
    return {
      transactions: [],
      stats: {
        totalRows: sheet.data.length,
        processedRows: 0,
        skippedRows: sheet.data.length,
        totalValue: 0,
        invalidValues: sheet.data.length,
        dateRange: { min: null, max: null },
        categoriesFound: [],
        costCentersFound: [],
      },
    };
  }

  sheet.data.forEach((row, index) => {
    const rawValue = row[valueCol];
    const parsedValue = parseNumericValue(rawValue);

    if (!parsedValue.valid) {
      invalidValues++;
      // Ainda assim tenta criar a transacao com valor 0, mas marca como invalido
    }

    const value = parsedValue.value;

    // Se a linha inteira estiver vazia ou sem dados minimos, pula
    const hasAnyData = Object.values(row).some((v) => v !== undefined && v !== "" && v !== null);
    if (!hasAnyData) {
      skippedRows++;
      return;
    }

    // Se nao tem valor valido E nao tem descricao/data, provavelmente e linha vazia/resumo
    if (!parsedValue.valid && !dateCol && !descCol) {
      skippedRows++;
      return;
    }

    let date = dateCol ? parseDate(row[dateCol]) : null;
    if (!date) {
      date = new Date().toISOString().split("T")[0];
    }

    if (date) {
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
    }

    let description = "";
    if (descCol && row[descCol]) {
      description = cleanText(row[descCol], "");
    }
    if (!description) {
      // Tenta usar a categoria como descricao
      if (catCol && row[catCol]) {
        description = cleanText(row[catCol], "");
      }
    }
    if (!description) {
      // Tenta qualquer coluna de texto que nao seja numerica
      for (const key of Object.keys(row)) {
        const val = String(row[key] || "");
        if (val.length > 0 && val.length < 100 && !val.match(/^-?\d+([.,]\d+)?$/)) {
          description = val.trim();
          break;
        }
      }
    }
    if (!description) {
      description = `Registro ${index + 1}`;
    }

    let category = "";
    if (catCol && row[catCol]) {
      category = cleanText(row[catCol], "");
    }
    if (!category) {
      category = "Não classificado";
    }

    let costCenter = "";
    if (ccCol && row[ccCol]) {
      costCenter = cleanText(row[ccCol], "");
    }
    if (!costCenter) {
      costCenter = "Geral";
    }

    categoriesFound.add(category);
    costCentersFound.add(costCenter);

    totalValue += Math.abs(value);

    const subcategory = cleanText(subcatCol ? row[subcatCol] : null, "");
    const account = cleanText(accountCol ? row[accountCol] : null, "");
    const unit = cleanText(unitCol ? row[unitCol] : null, "");
    const currency = cleanText(currencyCol ? row[currencyCol] : null, "BRL");
    const explicitDreGroup = dreGroupCol ? row[dreGroupCol] : null;
    const classification = resolveTransactionDREClassification({
      id: `tx-${index}`,
      date,
      description,
      category,
      dreGroup: undefined,
      dreOriginalGroup: String(explicitDreGroup ?? ""),
      subcategory,
      account,
      costCenter,
      unit,
      value: round2(value),
      currency,
      flowType: value >= 0 ? "income" : "expense",
    }, dreRules);

    transactions.push({
      id: `tx-${index}`,
      date,
      description,
      category,
      dreGroup: classification.group,
      dreOriginalGroup: classification.source === "explicit" ? classification.group : undefined,
      subcategory,
      account,
      costCenter,
      unit,
      value: round2(value),
      currency,
      flowType: value >= 0 ? "income" : "expense",
    });
  });

  const stats: BuildStats = {
    totalRows: sheet.data.length,
    processedRows: transactions.length,
    skippedRows,
    totalValue: round2(totalValue),
    invalidValues,
    dateRange: { min: minDate, max: maxDate },
    categoriesFound: Array.from(categoriesFound),
    costCentersFound: Array.from(costCentersFound),
  };

  return { transactions: transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), stats };
}
