import type { Transaction } from "@/contexts/AppContext";
import type { BuildStats } from "@/utils/transactionBuilder";

export interface ValidationIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  count?: number;
}

export interface ValidationReport {
  approved: boolean;
  checkedAt: string;
  errors: number;
  warnings: number;
  issueList: ValidationIssue[];
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function pushIssue(target: ValidationIssue[], issue: ValidationIssue) {
  if (issue.count === undefined || issue.count > 0) {
    target.push(issue);
  }
}

export function validateTransactions(
  transactions: Transaction[],
  stats?: Partial<BuildStats>,
): ValidationReport {
  const issueList: ValidationIssue[] = [];

  if (transactions.length === 0) {
    issueList.push({
      code: "no-transactions",
      severity: "error",
      message: "Nenhuma transação válida foi gerada.",
      count: 1,
    });
  }

  const invalidDates = transactions.filter((transaction) => !isValidIsoDate(transaction.date)).length;
  pushIssue(issueList, {
    code: "invalid-dates",
    severity: "error",
    message: "Existem lançamentos com data inválida.",
    count: invalidDates,
  });

  const invalidNumbers = transactions.filter((transaction) => !Number.isFinite(transaction.value)).length;
  pushIssue(issueList, {
    code: "invalid-values",
    severity: "error",
    message: "Existem lançamentos com valor não numérico.",
    count: invalidNumbers,
  });

  const inconsistentSigns = transactions.filter((transaction) =>
    (transaction.flowType === "income" && transaction.value < 0) ||
    (transaction.flowType === "expense" && transaction.value > 0),
  ).length;
  pushIssue(issueList, {
    code: "flow-sign-mismatch",
    severity: "error",
    message: "Existem lançamentos com sinal incompatível com o tipo de fluxo.",
    count: inconsistentSigns,
  });

  const duplicateIds = transactions.length - new Set(transactions.map((transaction) => transaction.id)).size;
  pushIssue(issueList, {
    code: "duplicate-ids",
    severity: "error",
    message: "Existem identificadores de transação duplicados.",
    count: duplicateIds,
  });

  const emptyDescriptions = transactions.filter((transaction) => !transaction.description.trim()).length;
  pushIssue(issueList, {
    code: "empty-descriptions",
    severity: "warning",
    message: "Existem lançamentos sem descrição preenchida.",
    count: emptyDescriptions,
  });

  const emptyCategories = transactions.filter((transaction) => !transaction.category.trim()).length;
  pushIssue(issueList, {
    code: "empty-categories",
    severity: "warning",
    message: "Existem lançamentos sem categoria preenchida.",
    count: emptyCategories,
  });

  const emptyCostCenters = transactions.filter((transaction) => !transaction.costCenter.trim()).length;
  pushIssue(issueList, {
    code: "empty-cost-centers",
    severity: "warning",
    message: "Existem lançamentos sem centro de custo preenchido.",
    count: emptyCostCenters,
  });

  pushIssue(issueList, {
    code: "source-invalid-values",
    severity: "warning",
    message: "Algumas linhas tiveram valores inválidos e foram tratadas durante a importação.",
    count: stats?.invalidValues ?? 0,
  });

  const errors = issueList.filter((issue) => issue.severity === "error").length;
  const warnings = issueList.filter((issue) => issue.severity === "warning").length;

  return {
    approved: errors === 0,
    checkedAt: new Date().toISOString(),
    errors,
    warnings,
    issueList,
  };
}

