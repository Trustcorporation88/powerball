import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Transaction } from "@/contexts/AppContext";
import { DRE_GROUP_OPTIONS, resolveTransactionDREClassification } from "@/services/dre";
import {
  DRE_RULE_FIELDS,
  DRE_RULE_OPERATORS,
  type DREClassificationRule,
  type DRERuleField,
  type DRERuleOperator,
  matchesDRERule,
  sortDRERules,
} from "@/services/dreRules";

interface DRERulesManagerProps {
  projectId?: string;
  transactions: Transaction[];
  rules: DREClassificationRule[];
  onChange: (rules: DREClassificationRule[]) => Promise<void>;
}

const FIELD_LABELS: Record<DRERuleField, string> = {
  category: "Categoria",
  subcategory: "Subcategoria",
  account: "Conta",
  description: "Descrição",
  costCenter: "Centro de custo",
};

const OPERATOR_LABELS: Record<DRERuleOperator, string> = {
  contains: "contém",
  equals: "é igual a",
  startsWith: "começa com",
};

function normalizePriorities(rules: DREClassificationRule[]): DREClassificationRule[] {
  return rules.map((rule, index) => ({
    ...rule,
    priority: index + 1,
  }));
}

export default function DRERulesManager({
  projectId,
  transactions,
  rules,
  onChange,
}: DRERulesManagerProps) {
  const orderedRules = useMemo(() => sortDRERules(rules), [rules]);
  const [field, setField] = useState<DRERuleField>("category");
  const [operator, setOperator] = useState<DRERuleOperator>("contains");
  const [value, setValue] = useState("");
  const [dreGroup, setDreGroup] = useState<string>(DRE_GROUP_OPTIONS[0]);

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        const classification = resolveTransactionDREClassification(transaction, orderedRules);
        acc[classification.source] += 1;
        return acc;
      },
      {
        explicit: 0,
        rule: 0,
        inferred: 0,
      },
    );
  }, [orderedRules, transactions]);

  const impacts = useMemo(() => {
    return Object.fromEntries(
      orderedRules.map((rule) => [
        rule.id,
        transactions.filter((transaction) => matchesDRERule(transaction, rule)).length,
      ]),
    ) as Record<string, number>;
  }, [orderedRules, transactions]);

  const persistRules = async (nextRules: DREClassificationRule[]) => {
    await onChange(normalizePriorities(sortDRERules(nextRules)));
  };

  const handleAddRule = async () => {
    const trimmedValue = value.trim();

    if (!projectId) {
      toast.error("Selecione um projeto para salvar regras DRE.");
      return;
    }

    if (!trimmedValue) {
      toast.error("Informe o valor que a regra deve procurar.");
      return;
    }

    const nextRule: DREClassificationRule = {
      id: crypto.randomUUID(),
      projectId,
      field,
      operator,
      value: trimmedValue,
      dreGroup,
      priority: orderedRules.length + 1,
      createdAt: new Date().toISOString(),
    };

    await persistRules([...orderedRules, nextRule]);
    setValue("");
    toast.success("Regra DRE adicionada.");
  };

  const handleRemoveRule = async (ruleId: string) => {
    await persistRules(orderedRules.filter((rule) => rule.id !== ruleId));
    toast.success("Regra DRE removida.");
  };

  const moveRule = async (ruleId: string, direction: -1 | 1) => {
    const currentIndex = orderedRules.findIndex((rule) => rule.id === ruleId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedRules.length) {
      return;
    }

    const nextRules = [...orderedRules];
    const [rule] = nextRules.splice(currentIndex, 1);
    nextRules.splice(targetIndex, 0, rule);
    await persistRules(nextRules);
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle>Regras DRE por cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Grupo explícito importado</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.explicit}</p>
          </div>
          <div className="rounded-lg border bg-emerald-50 p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Classificado por regra</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.rule}</p>
          </div>
          <div className="rounded-lg border bg-blue-50 p-4">
            <p className="text-xs uppercase tracking-wide text-blue-700">Ainda por inferência</p>
            <p className="mt-2 text-2xl font-bold text-blue-700">{summary.inferred}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-slate-50 p-4 space-y-4">
          <div>
            <p className="font-medium text-slate-900">Nova regra</p>
            <p className="text-sm text-slate-600">
              As regras são aplicadas na ordem exibida, antes da inferência automática e sem sobrescrever Grupo DRE explícito importado.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.4fr_1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Campo</Label>
              <Select value={field} onValueChange={(nextValue) => setField(nextValue as DRERuleField)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRE_RULE_FIELDS.map((ruleField) => (
                    <SelectItem key={ruleField} value={ruleField}>
                      {FIELD_LABELS[ruleField]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Operador</Label>
              <Select value={operator} onValueChange={(nextValue) => setOperator(nextValue as DRERuleOperator)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRE_RULE_OPERATORS.map((ruleOperator) => (
                    <SelectItem key={ruleOperator} value={ruleOperator}>
                      {OPERATOR_LABELS[ruleOperator]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Valor procurado</Label>
              <Input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Ex.: frete, marketing, CMV, juros"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Linha DRE</Label>
              <Select value={dreGroup} onValueChange={setDreGroup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRE_GROUP_OPTIONS.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void handleAddRule()}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Prioridade</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Se</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Valor</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Classificar em</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-700">Impacto</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orderedRules.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      Nenhuma regra criada ainda. Hoje o DRE usa grupo explícito da planilha e, quando não existe, inferência automática local.
                    </td>
                  </tr>
                )}

                {orderedRules.map((rule, index) => (
                  <tr key={rule.id} className="border-b last:border-b-0">
                    <td className="px-3 py-3 text-slate-900 font-medium">#{index + 1}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {FIELD_LABELS[rule.field]} {OPERATOR_LABELS[rule.operator]}
                    </td>
                    <td className="px-3 py-3 text-slate-900">{rule.value}</td>
                    <td className="px-3 py-3 text-slate-900">{rule.dreGroup}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{impacts[rule.id] ?? 0} lanç.</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void moveRule(rule.id, -1)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void moveRule(rule.id, 1)}
                          disabled={index === orderedRules.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleRemoveRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
