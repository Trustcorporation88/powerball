import type { Transaction } from "@/contexts/AppContext";
import { getMatchingDRERule, normalizeComparableValue, type DREClassificationRule } from "@/services/dreRules";

export const DRE_GROUP_OPTIONS = [
  "Receita Bruta",
  "Deduções",
  "Custos",
  "Despesas Operacionais",
  "Resultado Financeiro",
  "Impostos",
  "Outros Resultados",
] as const;

export type DREGroup = (typeof DRE_GROUP_OPTIONS)[number];

export interface DRELine {
  label: string;
  amount: number;
  kind: "group" | "result";
}

export interface DREReport {
  lines: DRELine[];
  groupTotals: Array<{ group: DREGroup; amount: number }>;
  summary: {
    receitaBruta: number;
    receitaLiquida: number;
    lucroBruto: number;
    ebitda: number;
    resultadoAntesImpostos: number;
    resultadoLiquido: number;
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeKey(value: unknown): string {
  return normalizeComparableValue(value).replace(/[^a-z0-9]/g, "");
}

const DRE_ALIASES: Record<string, DREGroup> = {
  receitabruta: "Receita Bruta",
  receita: "Receita Bruta",
  faturamento: "Receita Bruta",
  deducoes: "Deduções",
  deducao: "Deduções",
  impostossobrevendas: "Deduções",
  devolucoes: "Deduções",
  devolucao: "Deduções",
  custos: "Custos",
  custo: "Custos",
  cmv: "Custos",
  despesasoperacionais: "Despesas Operacionais",
  despesasadministrativas: "Despesas Operacionais",
  despesascomerciais: "Despesas Operacionais",
  opex: "Despesas Operacionais",
  resultadofinanceiro: "Resultado Financeiro",
  financeiro: "Resultado Financeiro",
  impostos: "Impostos",
  impostorenda: "Impostos",
  irpjcsll: "Impostos",
  outrosresultados: "Outros Resultados",
  naooperacional: "Outros Resultados",
};

export function normalizeDREGroup(raw: unknown): DREGroup | null {
  const normalized = normalizeKey(raw);
  if (!normalized) {
    return null;
  }

  return DRE_ALIASES[normalized] ?? null;
}

export function inferDREGroup(input: Pick<Transaction, "category" | "subcategory" | "description" | "account" | "flowType">): DREGroup {
  const haystack = normalizeKey([input.category, input.subcategory, input.description, input.account].join(" "));

  if (input.flowType === "income") {
    if (/(juros|rendiment|aplicac|descontoobtido|receitafinanceira|financeir)/.test(haystack)) {
      return "Resultado Financeiro";
    }

    if (/(outros|naooperac|extraordin|ganhoeventual|ganhoativo)/.test(haystack)) {
      return "Outros Resultados";
    }

    return "Receita Bruta";
  }

  if (/(devolu|abatiment|descontoconcedido|cancelamento|comissaosobrevenda|tributosobrevenda|pis|cofins|iss|icms)/.test(haystack)) {
    return "Deduções";
  }

  if (/(cmv|custo|custeio|mercador|materiaprim|insumo|estoque|fretecompra|operacoes|servicoprestado|producao)/.test(haystack)) {
    return "Custos";
  }

  if (/(juros|multa|iof|tarifa|financeir|encargobancario)/.test(haystack)) {
    return "Resultado Financeiro";
  }

  if (/(irpj|csll|impostoderenda|tributolucro|simplesnacional)/.test(haystack)) {
    return "Impostos";
  }

  if (/(outros|naooperac|extraordin|perdaeventual)/.test(haystack)) {
    return "Outros Resultados";
  }

  return "Despesas Operacionais";
}

export interface TransactionDREClassification {
  group: DREGroup;
  source: "explicit" | "rule" | "inferred";
  matchedRuleId?: string;
}

export function resolveTransactionDREClassification(
  transaction: Transaction,
  rules: DREClassificationRule[] = [],
): TransactionDREClassification {
  const explicitGroup = normalizeDREGroup(transaction.dreOriginalGroup);

  if (explicitGroup) {
    return {
      group: explicitGroup,
      source: "explicit",
    };
  }

  const matchedRule = getMatchingDRERule(transaction, rules);
  const matchedRuleGroup = normalizeDREGroup(matchedRule?.dreGroup);
  if (matchedRule && matchedRuleGroup) {
    return {
      group: matchedRuleGroup,
      source: "rule",
      matchedRuleId: matchedRule.id,
    };
  }

  const storedGroup = normalizeDREGroup(transaction.dreGroup);
  if (storedGroup) {
    return {
      group: storedGroup,
      source: "inferred",
    };
  }

  return {
    group: inferDREGroup(transaction),
    source: "inferred",
  };
}

export function getTransactionDREGroup(
  transaction: Transaction,
  rules: DREClassificationRule[] = [],
): DREGroup {
  return resolveTransactionDREClassification(transaction, rules).group;
}

export function buildDREReport(
  transactions: Transaction[],
  rules: DREClassificationRule[] = [],
): DREReport {
  const totals = Object.fromEntries(
    DRE_GROUP_OPTIONS.map((group) => [group, 0]),
  ) as Record<DREGroup, number>;

  transactions.forEach((transaction) => {
    const group = getTransactionDREGroup(transaction, rules);
    totals[group] += transaction.value;
  });

  const receitaBruta = round2(totals["Receita Bruta"]);
  const deducoes = round2(totals["Deduções"]);
  const receitaLiquida = round2(receitaBruta + deducoes);
  const custos = round2(totals["Custos"]);
  const lucroBruto = round2(receitaLiquida + custos);
  const despesasOperacionais = round2(totals["Despesas Operacionais"]);
  const ebitda = round2(lucroBruto + despesasOperacionais);
  const resultadoFinanceiro = round2(totals["Resultado Financeiro"]);
  const outrosResultados = round2(totals["Outros Resultados"]);
  const resultadoAntesImpostos = round2(ebitda + resultadoFinanceiro + outrosResultados);
  const impostos = round2(totals["Impostos"]);
  const resultadoLiquido = round2(resultadoAntesImpostos + impostos);

  return {
    lines: [
      { label: "Receita Bruta", amount: receitaBruta, kind: "group" },
      { label: "(-) Deduções", amount: deducoes, kind: "group" },
      { label: "Receita Líquida", amount: receitaLiquida, kind: "result" },
      { label: "(-) Custos", amount: custos, kind: "group" },
      { label: "Lucro Bruto", amount: lucroBruto, kind: "result" },
      { label: "(-) Despesas Operacionais", amount: despesasOperacionais, kind: "group" },
      { label: "EBITDA / Resultado Operacional", amount: ebitda, kind: "result" },
      { label: "(+/-) Resultado Financeiro", amount: resultadoFinanceiro, kind: "group" },
      { label: "(+/-) Outros Resultados", amount: outrosResultados, kind: "group" },
      { label: "Resultado Antes dos Impostos", amount: resultadoAntesImpostos, kind: "result" },
      { label: "(-) Impostos", amount: impostos, kind: "group" },
      { label: "Resultado Líquido", amount: resultadoLiquido, kind: "result" },
    ],
    groupTotals: DRE_GROUP_OPTIONS.map((group) => ({
      group,
      amount: round2(totals[group]),
    })),
    summary: {
      receitaBruta,
      receitaLiquida,
      lucroBruto,
      ebitda,
      resultadoAntesImpostos,
      resultadoLiquido,
    },
  };
}
