import type { Transaction } from "@/contexts/AppContext";
import type { BuildStats } from "@/utils/transactionBuilder";
import { buildDREReport, resolveTransactionDREClassification } from "@/services/dre";
import type { DREClassificationRule } from "@/services/dreRules";

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

export function mergeValidationReports(...reports: ValidationReport[]): ValidationReport {
  const issueList = reports.flatMap((report) => report.issueList);
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

export function validateDRETransactions(
  transactions: Transaction[],
  rules: DREClassificationRule[] = [],
): ValidationReport {
  const issueList: ValidationIssue[] = [];

  if (transactions.length === 0) {
    issueList.push({
      code: "dre-no-transactions",
      severity: "error",
      message: "Não existem lançamentos no período selecionado para compor a entrega DRE.",
      count: 1,
    });
  }

  const classifiedTransactions = transactions.map((transaction) => ({
    transaction,
    classification: resolveTransactionDREClassification(transaction, rules),
  }));

  const inferredCount = classifiedTransactions.filter((entry) => entry.classification.source === "inferred").length;
  const inferredRatio = transactions.length > 0 ? inferredCount / transactions.length : 0;

  pushIssue(issueList, {
    code: "dre-too-many-inferred",
    severity: inferredRatio > 0.6 ? "error" : "warning",
    message:
      inferredRatio > 0.6
        ? "A maior parte do DRE ainda depende de inferência automática; configure regras ou mapeamentos explícitos."
        : "Parte do DRE ainda depende de inferência automática; vale criar regras para reduzir ambiguidades.",
    count: inferredCount,
  });

  const incomeInExpenseGroups = classifiedTransactions.filter(({ transaction, classification }) =>
    transaction.flowType === "income" &&
    ["Deduções", "Custos", "Despesas Operacionais", "Impostos"].includes(classification.group),
  ).length;
  pushIssue(issueList, {
    code: "dre-income-in-expense-groups",
    severity: "error",
    message: "Existem receitas classificadas em linhas típicas de dedução, custo, despesa ou imposto.",
    count: incomeInExpenseGroups,
  });

  const expenseInRevenueGroup = classifiedTransactions.filter(({ transaction, classification }) =>
    transaction.flowType === "expense" && classification.group === "Receita Bruta",
  ).length;
  pushIssue(issueList, {
    code: "dre-expense-in-revenue-group",
    severity: "error",
    message: "Existem despesas classificadas em Receita Bruta.",
    count: expenseInRevenueGroup,
  });

  const dreReport = buildDREReport(transactions, rules);
  const groupTotals = Object.fromEntries(dreReport.groupTotals.map((group) => [group.group, group.amount]));

  pushIssue(issueList, {
    code: "dre-positive-deductions",
    severity: "error",
    message: "As deduções ficaram positivas, o que sugere sinal ou classificação incorreta.",
    count: groupTotals["Deduções"] > 0 ? 1 : 0,
  });

  pushIssue(issueList, {
    code: "dre-positive-costs",
    severity: "error",
    message: "Os custos ficaram positivos, o que sugere sinal ou classificação incorreta.",
    count: groupTotals["Custos"] > 0 ? 1 : 0,
  });

  pushIssue(issueList, {
    code: "dre-positive-operating-expenses",
    severity: "error",
    message: "As despesas operacionais ficaram positivas, o que sugere sinal ou classificação incorreta.",
    count: groupTotals["Despesas Operacionais"] > 0 ? 1 : 0,
  });

  pushIssue(issueList, {
    code: "dre-net-revenue-above-gross",
    severity: "warning",
    message: "A receita líquida ficou acima da receita bruta; revise deduções e sinais.",
    count: dreReport.summary.receitaLiquida > dreReport.summary.receitaBruta ? 1 : 0,
  });

  pushIssue(issueList, {
    code: "dre-gross-profit-above-net-revenue",
    severity: "warning",
    message: "O lucro bruto ficou acima da receita líquida; revise custos e sinais.",
    count: dreReport.summary.lucroBruto > dreReport.summary.receitaLiquida ? 1 : 0,
  });

  pushIssue(issueList, {
    code: "dre-no-gross-revenue",
    severity: "warning",
    message: "Não há receita bruta positiva no período selecionado.",
    count: dreReport.summary.receitaBruta <= 0 ? 1 : 0,
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

