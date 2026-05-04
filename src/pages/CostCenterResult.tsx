import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, Building2, Database, FileSpreadsheet, FileText } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CostCenterResult() {
  const { currentProject, getRLSFilteredData, setTransactions } = useApp();
  const { user } = useAuth();

  const visibleTransactions = useMemo(
    () => getRLSFilteredData(user?.role ?? "user"),
    [getRLSFilteredData, user?.role],
  );
  const validationReport = useMemo(
    () => validateTransactions(visibleTransactions),
    [visibleTransactions],
  );

  const costCenterRows = useMemo(() => {
    const grouped = visibleTransactions.reduce<Record<string, { name: string; income: number; expense: number }>>((acc, transaction) => {
      const name = transaction.costCenter || "Sem centro de custo";
      const current = acc[name] ?? { name, income: 0, expense: 0 };

      if (transaction.flowType === "income") {
        current.income += transaction.value;
      } else {
        current.expense += Math.abs(transaction.value);
      }

      acc[name] = current;
      return acc;
    }, {});

    return Object.values(grouped)
      .map((entry) => ({
        ...entry,
        balance: entry.income - entry.expense,
        margin: entry.income > 0 ? ((entry.income - entry.expense) / entry.income) * 100 : 0,
      }))
      .sort((left, right) => right.balance - left.balance);
  }, [visibleTransactions]);

  const totalBalance = costCenterRows.reduce((sum, row) => sum + row.balance, 0);
  const bestCenter = costCenterRows[0] ?? null;
  const worstCenter = costCenterRows.at(-1) ?? null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link to="/home" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Resultado por Centro de Custo</h1>
            <p className="text-sm text-muted-foreground">
              Receita, despesa, saldo e margem por unidade operacional
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
              Importe uma planilha ou carregue dados demo para gerar o resultado por centro de custo.
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

      {visibleTransactions.length > 0 && <ValidationSummary report={validationReport} title="Validação do resultado por centro de custo" />}

      {validationReport.approved && visibleTransactions.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Centros de custo", value: String(costCenterRows.length), style: "bg-slate-50 border-slate-200 text-slate-900" },
              { label: "Saldo consolidado", value: formatCurrency(totalBalance), style: "bg-blue-50 border-blue-200 text-blue-700" },
              { label: "Melhor centro", value: bestCenter?.name ?? "-", style: "bg-emerald-50 border-emerald-200 text-emerald-700" },
              { label: "Pior centro", value: worstCenter?.name ?? "-", style: "bg-rose-50 border-rose-200 text-rose-700" },
            ].map((card) => (
              <Card key={card.label} className={`border ${card.style}`}>
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
                  <p className="text-xl font-bold mt-2">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Saldo por Centro de Custo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={costCenterRows.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" angle={-20} textAnchor="end" height={70} interval={0} />
                    <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="income" name="Receita" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Despesa" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="balance" name="Saldo" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leitura Operacional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Maior margem</p>
                  <p className="mt-2 font-semibold text-emerald-700">
                    {costCenterRows.length > 0
                      ? `${costCenterRows.reduce((best, row) => (row.margin > best.margin ? row : best)).name} • ${costCenterRows.reduce((best, row) => (row.margin > best.margin ? row : best)).margin.toFixed(1)}%`
                      : "-"}
                  </p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Maior saldo</p>
                  <p className="mt-2 font-semibold text-emerald-700">
                    {bestCenter ? `${bestCenter.name} • ${formatCurrency(bestCenter.balance)}` : "-"}
                  </p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Menor saldo</p>
                  <p className="mt-2 font-semibold text-rose-700">
                    {worstCenter ? `${worstCenter.name} • ${formatCurrency(worstCenter.balance)}` : "-"}
                  </p>
                </div>
                <Link to="/detail">
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" /> Abrir visão auditável
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quadro consolidado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-700">Centro de custo</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-700">Receita</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-700">Despesa</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-700">Saldo</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-700">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costCenterRows.map((row) => (
                      <tr key={row.name} className="border-b last:border-b-0">
                        <td className="px-3 py-3 text-slate-900">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            {row.name}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-emerald-700">{formatCurrency(row.income)}</td>
                        <td className="px-3 py-3 text-right text-rose-700">{formatCurrency(row.expense)}</td>
                        <td className={`px-3 py-3 text-right font-medium ${row.balance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {formatCurrency(row.balance)}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">{row.margin.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
