import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Percent, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Transaction, useApp } from "@/contexts/AppContext";
import { KpiData, useDashboardData } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";

interface WhatIfPanelProps {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
  kpis: KpiData;
}

interface SimulationParams {
  revenueGrowth: number;
  expenseReduction: number;
  marginTarget: number;
}

export default function WhatIfPanel({
  open,
  onClose,
  transactions,
  kpis,
}: WhatIfPanelProps) {
  const [params, setParams] = useState<SimulationParams>({
    revenueGrowth: 10,
    expenseReduction: 5,
    marginTarget: 20,
  });

  const simulated = useMemo(() => {
    const income = transactions
      .filter((t) => t.flowType === "income")
      .reduce((s, t) => s + t.value, 0);
    const expense = transactions
      .filter((t) => t.flowType === "expense")
      .reduce((s, t) => s + Math.abs(t.value), 0);

    const growthFactor = 1 + params.revenueGrowth / 100;
    const reductionFactor = 1 - params.expenseReduction / 100;

    const simIncome = income * growthFactor;
    const simExpense = expense * reductionFactor;
    const simBalance = simIncome - simExpense;
    const simMargin = simIncome > 0 ? (simBalance / simIncome) * 100 : 0;

    return {
      income: simIncome,
      expense: simExpense,
      balance: simBalance,
      margin: simMargin,
    };
  }, [transactions, params]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const diff = (sim: number, curr: number) => sim - curr;
  const diffPercent = (sim: number, curr: number) =>
    curr !== 0 ? ((sim - curr) / Math.abs(curr)) * 100 : 0;

  const rows = [
    { label: "Receita Total", curr: kpis.income, sim: simulated.income, isGood: true },
    { label: "Despesa Total", curr: kpis.expense, sim: simulated.expense, isGood: false },
    { label: "Saldo Líquido", curr: kpis.balance, sim: simulated.balance, isGood: true },
    { label: "Margem", curr: kpis.margin, sim: simulated.margin, isGood: true, unit: "%" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-slate-800">
                  Simulação What-If
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardContent className="p-4">
                  <p className="text-xs text-emerald-700 font-medium">
                    Ajuste os parâmetros abaixo para simular cenários futuros. Os valores
                    simulados são exibidos ao lado dos atuais.
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Crescimento de Receita
                    </label>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      +{params.revenueGrowth}%
                    </Badge>
                  </div>
                  <Slider
                    value={[params.revenueGrowth]}
                    onValueChange={([v]) =>
                      setParams((p) => ({ ...p, revenueGrowth: v }))
                    }
                    min={0}
                    max={50}
                    step={1}
                    className="[&_[data-orientation=horizontal]]:bg-emerald-200 [&_[data-orientation=horizontal]>span]:bg-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0%</span>
                    <span>50%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Redução de Despesas
                    </label>
                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
                      -{params.expenseReduction}%
                    </Badge>
                  </div>
                  <Slider
                    value={[params.expenseReduction]}
                    onValueChange={([v]) =>
                      setParams((p) => ({ ...p, expenseReduction: v }))
                    }
                    min={0}
                    max={30}
                    step={1}
                    className="[&_[data-orientation=horizontal]]:bg-rose-200 [&_[data-orientation=horizontal]>span]:bg-rose-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0%</span>
                    <span>30%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Margem Alvo
                    </label>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      {params.marginTarget}%
                    </Badge>
                  </div>
                  <Slider
                    value={[params.marginTarget]}
                    onValueChange={([v]) =>
                      setParams((p) => ({ ...p, marginTarget: v }))
                    }
                    min={0}
                    max={60}
                    step={1}
                    className="[&_[data-orientation=horizontal]]:bg-blue-200 [&_[data-orientation=horizontal]>span]:bg-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0%</span>
                    <span>60%</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">
                  Comparativo: Atual vs Simulado
                </h3>
                <div className="space-y-2">
                  {rows.map((row) => (
                    <motion.div
                      key={row.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <span className="text-sm text-slate-600">{row.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">
                          {row.unit
                            ? `${row.curr.toFixed(1)}${row.unit}`
                            : formatCurrency(row.curr)}
                        </span>
                        <span className="text-xs text-slate-300">→</span>
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            diff(row.sim, row.curr) > 0
                              ? row.isGood
                                ? "text-emerald-600"
                                : "text-rose-600"
                              : diff(row.sim, row.curr) < 0
                              ? row.isGood
                                ? "text-rose-600"
                                : "text-emerald-600"
                              : "text-slate-600"
                          )}
                        >
                          {row.unit
                            ? `${row.sim.toFixed(1)}${row.unit}`
                            : formatCurrency(row.sim)}
                        </span>
                        <Badge
                          className={cn(
                            "text-[10px]",
                            diff(row.sim, row.curr) > 0
                              ? row.isGood
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                              : diff(row.sim, row.curr) < 0
                              ? row.isGood
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {diffPercent(row.sim, row.curr) >= 0 ? "+" : ""}
                          {diffPercent(row.sim, row.curr).toFixed(1)}%
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => onClose()}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Salvar Simulação
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
