type FormulaToken =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" }
  | { type: "leftParen" }
  | { type: "rightParen" };

interface FormulaValidationResult {
  valid: boolean;
  error?: string;
}

function parseNumericCellValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  const negativeByParentheses = trimmed.startsWith("(") && trimmed.endsWith(")");
  const normalized = trimmed
    .replace(/[R$\s]/g, "")
    .replace(/\((.*)\)/, "$1");

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  let numericText = normalized;

  if (hasComma && hasDot) {
    numericText =
      normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (hasComma) {
    numericText = normalized.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(numericText);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return negativeByParentheses ? -Math.abs(parsed) : parsed;
}

function tokenize(formula: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let index = 0;

  while (index < formula.length) {
    const current = formula[index];

    if (/\s/.test(current)) {
      index += 1;
      continue;
    }

    if (current === "(") {
      tokens.push({ type: "leftParen" });
      index += 1;
      continue;
    }

    if (current === ")") {
      tokens.push({ type: "rightParen" });
      index += 1;
      continue;
    }

    if (current === "+" || current === "-" || current === "*" || current === "/") {
      tokens.push({ type: "operator", value: current });
      index += 1;
      continue;
    }

    if (current === "[") {
      const end = formula.indexOf("]", index + 1);
      if (end === -1) {
        throw new Error("Referência de coluna sem fechamento ]");
      }

      const columnName = formula.slice(index + 1, end).trim();
      if (!columnName) {
        throw new Error("Referência de coluna vazia");
      }

      tokens.push({ type: "identifier", value: columnName });
      index = end + 1;
      continue;
    }

    if (/\d|[.,]/.test(current)) {
      let end = index + 1;
      while (end < formula.length && /[\d.,]/.test(formula[end])) {
        end += 1;
      }

      const value = parseNumericCellValue(formula.slice(index, end));
      tokens.push({ type: "number", value });
      index = end;
      continue;
    }

    if (/[\p{L}\p{N}_.$]/u.test(current)) {
      let end = index + 1;
      while (end < formula.length && /[\p{L}\p{N}_.$]/u.test(formula[end])) {
        end += 1;
      }

      tokens.push({ type: "identifier", value: formula.slice(index, end) });
      index = end;
      continue;
    }

    throw new Error(`Caractere não suportado: ${current}`);
  }

  return tokens;
}

export function validateFormula(
  formula: string,
  availableColumns: string[],
): FormulaValidationResult {
  const trimmed = formula.trim();
  if (!trimmed) {
    return { valid: false, error: "Informe uma fórmula" };
  }

  try {
    evaluateFormula(
      trimmed,
      Object.fromEntries(availableColumns.map((column) => [column, 0])),
    );
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Fórmula inválida",
    };
  }
}

export function evaluateFormula(
  formula: string,
  row: Record<string, unknown>,
): number {
  const tokens = tokenize(formula);
  let index = 0;

  const peek = (): FormulaToken | undefined => tokens[index];
  const consume = (): FormulaToken => {
    const token = tokens[index];
    if (!token) {
      throw new Error("Fórmula incompleta");
    }

    index += 1;
    return token;
  };

  const parseFactor = (): number => {
    const token = consume();

    if (token.type === "number") {
      return token.value;
    }

    if (token.type === "identifier") {
      return parseNumericCellValue(row[token.value]);
    }

    if (token.type === "operator" && (token.value === "+" || token.value === "-")) {
      const factor = parseFactor();
      return token.value === "-" ? -factor : factor;
    }

    if (token.type === "leftParen") {
      const result = parseExpression();
      const next = consume();
      if (next.type !== "rightParen") {
        throw new Error("Parênteses desbalanceados");
      }
      return result;
    }

    throw new Error("Estrutura de fórmula inválida");
  };

  const parseTerm = (): number => {
    let result = parseFactor();

    while (peek()?.type === "operator" && (peek() as FormulaToken & { type: "operator" }).value.match(/[*/]/)) {
      const operator = (consume() as Extract<FormulaToken, { type: "operator" }>).value;
      const factor = parseFactor();
      result = operator === "*" ? result * factor : result / factor;
    }

    return result;
  };

  const parseExpression = (): number => {
    let result = parseTerm();

    while (peek()?.type === "operator" && (peek() as FormulaToken & { type: "operator" }).value.match(/[+-]/)) {
      const operator = (consume() as Extract<FormulaToken, { type: "operator" }>).value;
      const term = parseTerm();
      result = operator === "+" ? result + term : result - term;
    }

    return result;
  };

  const result = parseExpression();

  if (index < tokens.length) {
    throw new Error("Fórmula contém tokens inválidos no final");
  }

  if (!Number.isFinite(result)) {
    throw new Error("Resultado da fórmula é inválido");
  }

  return Math.round(result * 100) / 100;
}

