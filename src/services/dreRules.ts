import type { Transaction } from "@/contexts/AppContext";

export const DRE_RULE_FIELDS = [
  "category",
  "subcategory",
  "account",
  "description",
  "costCenter",
] as const;

export const DRE_RULE_OPERATORS = [
  "contains",
  "equals",
  "startsWith",
] as const;

export type DRERuleField = (typeof DRE_RULE_FIELDS)[number];
export type DRERuleOperator = (typeof DRE_RULE_OPERATORS)[number];

export interface DREClassificationRule {
  id: string;
  projectId: string;
  field: DRERuleField;
  operator: DRERuleOperator;
  value: string;
  dreGroup: string;
  priority: number;
  createdAt: string;
}

export function normalizeComparableValue(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function sortDRERules(rules: DREClassificationRule[]): DREClassificationRule[] {
  return [...rules].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function getRuleFieldValue(transaction: Transaction, field: DRERuleField): string {
  return normalizeComparableValue(transaction[field]);
}

export function matchesDRERule(transaction: Transaction, rule: DREClassificationRule): boolean {
  const candidate = getRuleFieldValue(transaction, rule.field);
  const expected = normalizeComparableValue(rule.value);

  if (!candidate || !expected) {
    return false;
  }

  switch (rule.operator) {
    case "equals":
      return candidate === expected;
    case "startsWith":
      return candidate.startsWith(expected);
    case "contains":
    default:
      return candidate.includes(expected);
  }
}

export function getMatchingDRERule(
  transaction: Transaction,
  rules: DREClassificationRule[],
): DREClassificationRule | null {
  const orderedRules = sortDRERules(rules);

  for (const rule of orderedRules) {
    if (matchesDRERule(transaction, rule)) {
      return rule;
    }
  }

  return null;
}
