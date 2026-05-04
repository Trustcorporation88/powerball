import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ExportButton from "@/components/dashboard/ExportButton";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { validateTransactions } from "@/services/validation";
import { ValidationSummary } from "@/components/ValidationSummary";

interface MonthlyDetailPoint {
  month: string;
  value: number;
  income: number;
  expense: number;
}

export default function DetailView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getRLSFilteredData } = useApp();
  const { user } = useAuth();

  const drillCategory = searchParams.get('category');
  const drillCostCenter = searchParams.get('costCenter');
  const drillPeriod = searchParams.get('period');

  const visibleTransactions = useMemo(
    () => getRLSFilteredData(user?.role ?? "user"),
    [getRLSFilteredData, user?.role],
  );
  const validationReport = useMemo(
    () => validateTransactions(visibleTransactions),
    [visibleTransactions],
  );

  const filteredTransactions = useMemo(() => {
    return visibleTransactions.filter(t => {
      if (drillCategory && t.category !== drillCategory) return false;
      if (drillCostCenter && t.costCenter !== drillCostCenter) return false;
      return true;
    });
  }, [visibleTransactions, drillCategory, drillCostCenter]);

  const monthlyDetail = filteredTransactions.reduce<MonthlyDetailPoint[]>((acc, t) => {
    const month = t.date.slice(0, 7);
    const existing = acc.find((entry) => entry.month === month);
    if (existing) {
      existing.value += Math.abs(t.value);
      existing.income += t.flowType === "income" ? t.value : 0;
      existing.expense += t.flowType === "expense" ? Math.abs(t.value) : 0;
    } else {
      acc.push({
        month,
        value: Math.abs(t.value),
        income: t.flowType === "income" ? t.value : 0,
        expense: t.flowType === "expense" ? Math.abs(t.value) : 0,
      });
    }
    return acc;
  }, []).sort((a, b) => a.month.localeCompare(b.month));

  const categories = [...new Set(filteredTransactions.map((t) => t.category))];
  const costCenters = [...new Set(filteredTransactions.map((t) => t.costCenter))];

  const totalIncome = filteredTransactions.filter(t => t.flowType === "income").reduce((s, t) => s + t.value, 0);
  const totalExpense = filteredTransactions.filter(t => t.flowType === "expense").reduce((s, t) => s + Math.abs(t.value), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Detalhe Analítico</h1>
          <p className="text-slate-500 mt-1">
            Visão detalhada dos lançamentos
            {(drillCategory || drillCostCenter) && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Filter className="h-3 w-3" />
                {drillCategory && <Badge variant="secondary" className="text-xs">{drillCategory}</Badge>}
                {drillCostCenter && <Badge variant="secondary" className="text-xs">{drillCostCenter}</Badge>}
              </span>
            )}
          </p>
        </div>
        <ExportButton />
      </div>

      <ValidationSummary report={validationReport} title="Validação da visão detalhada" />

      {!validationReport.approved && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-5 text-sm text-rose-700">
            A visualização detalhada foi bloqueada porque a validação local encontrou inconsistências críticas nos dados.
          </CardContent>
        </Card>
      )}

      {validationReport.approved && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-slate-200 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Série Temporal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyDetail}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                    <Area type="monotone" dataKey="income" name="Receita" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expense" name="Despesa" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-emerald-50 rounded-lg border border-emerald-100"
                >
                  <p className="text-sm text-emerald-600 font-medium">Receita Total</p>
                  <p className="text-2xl font-bold text-emerald-800">
                    {totalIncome.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 bg-rose-50 rounded-lg border border-rose-100"
                >
                  <p className="text-sm text-rose-600 font-medium">Despesa Total</p>
                  <p className="text-2xl font-bold text-rose-800">
                    {totalExpense.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 bg-emerald-50 rounded-lg border border-emerald-100"
                >
                  <p className="text-sm text-emerald-600 font-medium">Total de Lançamentos</p>
                  <p className="text-xl font-bold text-emerald-800">{filteredTransactions.length}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 bg-blue-50 rounded-lg border border-blue-100"
                >
                  <p className="text-sm text-blue-600 font-medium">Categorias</p>
                  <p className="text-lg font-bold text-blue-800">{categories.length}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 bg-violet-50 rounded-lg border border-violet-100"
                >
                  <p className="text-sm text-violet-600 font-medium">Centros de Custo</p>
                  <p className="text-lg font-bold text-violet-800">{costCenters.length}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 bg-amber-50 rounded-lg border border-amber-100"
                >
                  <p className="text-sm text-amber-600 font-medium">Saldo</p>
                  <p className="text-xl font-bold text-amber-800">
                    {(totalIncome - totalExpense).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </div>

          <TransactionsTable transactions={filteredTransactions} />
        </>
      )}
    </div>
  );
}
