import { useMemo, useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, Database, FileSpreadsheet, LineChart as LineChartIcon } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { generateMockTransactions } from "@/data/mockData";
import ExportButton from "@/components/dashboard/ExportButton";
import { ValidationSummary } from "@/components/ValidationSummary";
import { validateTransactions } from "@/services/validation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditPanel } from "@/components/audit/AuditPanel";
import { auditCashFlow, type AuditReport } from "@/services/audit";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CashFlow() {
  const { currentProject, getRLSFilteredData, setTransactions } = useApp();
  const { user } = useAuth();
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditKey, setAuditKey] = useState<string>("");

  const visibleTransactions = useMemo(
    () => getRLSFilteredData(user?.role ?? "user"),
    [getRLSFilteredData, user?.role],
  );
  const validationReport = useMemo(
    () => validateTransactions(visibleTransactions),
    [visibleTransactions],
  );

  const monthlyFlow = useMemo(() => {
    let cumulative = 0;
    const grouped = visibleTransactions.reduce<Record<string, { month: string; income: number; expense: number }>>((acc, transaction) => {
      const month = transaction.date.slice(0, 7);
      const current = acc[month] ?? { month, income: 0, expense: 0 };

      if (transaction.flowType === "income") {
        current.income += transaction.value;
      } else {
        current.expense += Math.abs(transaction.value);
      }

      acc[month] = current;
      return acc;
    }, {});

    return Object.values(grouped)
      .sort((left, right) => left.month.localeCompare(right.month))
      .map((entry) => {
        const net = entry.income - entry.expense;
        cumulative += net;
        return {
          ...entry,
          net,
          cumulative,
        };
      });
  }, [visibleTransactions]);

  const totalIncome = monthlyFlow.reduce((sum, entry) => sum + entry.income, 0);
  const totalExpense = monthlyFlow.reduce((sum, entry) => sum + entry.expense, 0);
  const totalNet = totalIncome - totalExpense;
  const endingBalance = monthlyFlow.at(-1)?.cumulative ?? totalNet;

  const runCashFlowAudit = useCallback(async () => {
    if (monthlyFlow.length === 0) {
      return;
    }

    setAuditLoading(true);
    try {
      const dataForAudit = monthlyFlow.map(m => ({
        month: m.month,
        income: m.income,
        expense: m.expense,
        balance: m.cumulative,
      }));

      const report = await auditCashFlow(dataForAudit);
      setAuditReport(report);
    } catch (error) {
      console.error('CashFlow audit failed:', error);
    } finally {
      setAuditLoading(false);
    }
  }, [monthlyFlow]);

  // Auto-run audit when monthly flow changes
  useEffect(() => {
    if (monthlyFlow.length === 0) {
      setAuditReport(null);
      return;
    }

    const currentKey = JSON.stringify(monthlyFlow);
    if (currentKey !== auditKey) {
      setAuditKey(currentKey);
      setAuditReport(null);
      
      const timer = setTimeout(() => {
        runCashFlowAudit();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [monthlyFlow, auditKey, runCashFlowAudit]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link to="/home" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
            <p className="text-sm text-muted-foreground">
              Entradas, saídas, saldo do período e evolução acumulada
              {currentProject ? ` — ${currentProject.name}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => {
              void setTransactions(generateMockTransactions());
            }}
          >
            <Database className="h-4 w-4 mr-1" /> Dados Demo
          </Button>
          <ExportButton data={visibleTransactions} />
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-1" /> Dashboard Analítico
            </Button>
          </Link>
        </div>
      </div>

      {visibleTransactions.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-8 text-center">
            <Database className="h-10 w-10 mx-auto text-amber-600 mb-3" />
            <h2 className="text-xl font-semibold text-amber-900 mb-2">Nenhum dado financeiro disponível</h2>
            <p className="text-sm text-amber-700 mb-4">
              Importe uma planilha ou carregue dados demo para gerar a entrega de Fluxo de Caixa.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/import">
                <Button variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Importar Planilha
                </Button>
              </Link>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => {
                  void setTransactions(generateMockTransactions());
                }}
              >
                <Database className="h-4 w-4 mr-2" /> Usar Dados Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {visibleTransactions.length > 0 && <ValidationSummary report={validationReport} title="Validação do fluxo de caixa" />}

      {monthlyFlow.length > 0 && (
        <AuditPanel
          type="cashflow"
          audit={auditReport}
          loading={auditLoading}
          onRunAudit={runCashFlowAudit}
          blocking={true}
          disabled={monthlyFlow.length === 0}
        />
      )}

      {validationReport.approved && visibleTransactions.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Entradas", value: totalIncome, style: "bg-emerald-50 border-emerald-200 text-emerald-700" },
              { label: "Saídas", value: totalExpense, style: "bg-rose-50 border-rose-200 text-rose-700" },
              { label: "Saldo do Período", value: totalNet, style: "bg-blue-50 border-blue-200 text-blue-700" },
              { label: "Caixa Acumulado", value: endingBalance, style: "bg-violet-50 border-violet-200 text-violet-700" },
            ].map((card) => (
              <Card key={card.label} className={`border ${card.style}`}>
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(card.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Evolução do Caixa</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={monthlyFlow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="income" name="Entradas" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Saídas" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    <Line type="monotone" dataKey="cumulative" name="Caixa acumulado" stroke="#2563eb" strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leitura Executiva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Meses analisados</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{monthlyFlow.length}</p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Melhor saldo mensal</p>
                  <p className="mt-2 font-semibold text-emerald-700">
                    {monthlyFlow.length > 0
                      ? `${monthlyFlow.reduce((best, entry) => (entry.net > best.net ? entry : best)).month} • ${formatCurrency(monthlyFlow.reduce((best, entry) => (entry.net > best.net ? entry : best)).net)}`
                      : "-"}
                  </p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Pior saldo mensal</p>
                  <p className="mt-2 font-semibold text-rose-700">
                    {monthlyFlow.length > 0
                      ? `${monthlyFlow.reduce((worst, entry) => (entry.net < worst.net ? entry : worst)).month} • ${formatCurrency(monthlyFlow.reduce((worst, entry) => (entry.net < worst.net ? entry : worst)).net)}`
                      : "-"}
                  </p>
                </div>
                <Link to="/detail">
                  <Button variant="outline" className="w-full">
                    <LineChartIcon className="h-4 w-4 mr-2" /> Abrir visão auditável
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
