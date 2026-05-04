import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, Database, FileText, FileSpreadsheet } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import DRERulesManager from "@/components/dre/DRERulesManager";
import DREExportButton from "@/components/dre/DREExportButton";
import { DREDataGuide } from "@/components/dre/DREDataGuide";
import { BenchmarkDialog } from "@/components/BenchmarkDialog";
import { AuditReportDisplay } from "@/components/AuditReportDisplay";
import { performFullAudit, type AuditReport } from "@/services/audit";
import { buildDREReport } from "@/services/dre";
import { mergeValidationReports, validateDRETransactions, validateTransactions } from "@/services/validation";
import { generateMockTransactions } from "@/data/mockData";
import { ValidationSummary } from "@/components/ValidationSummary";
import ExportButton from "@/components/dashboard/ExportButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PeriodGranularity = "month" | "quarter" | "year";

interface PeriodOption {
  value: string;
  label: string;
  sortKey: number;
}

const MONTH_LABELS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getPeriodOption(date: string, granularity: PeriodGranularity): PeriodOption {
  const [yearText, monthText = "01"] = date.slice(0, 10).split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const monthIndex = Math.max(0, Math.min(11, month - 1));

  if (granularity === "year") {
    return {
      value: String(year),
      label: String(year),
      sortKey: year * 100,
    };
  }

  if (granularity === "quarter") {
    const quarter = Math.floor(monthIndex / 3) + 1;
    return {
      value: `${year}-Q${quarter}`,
      label: `T${quarter}/${year}`,
      sortKey: year * 10 + quarter,
    };
  }

  return {
    value: `${year}-${String(month).padStart(2, "0")}`,
    label: `${MONTH_LABELS[monthIndex]}/${year}`,
    sortKey: year * 100 + month,
  };
}

function getPreviousPeriodValue(value: string, granularity: PeriodGranularity): string | null {
  if (granularity === "year") {
    const year = Number(value);
    return Number.isFinite(year) ? String(year - 1) : null;
  }

  if (granularity === "quarter") {
    const match = value.match(/^(\d{4})-Q([1-4])$/);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const quarter = Number(match[2]);
    if (quarter === 1) {
      return `${year - 1}-Q4`;
    }
    return `${year}-Q${quarter - 1}`;
  }

  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month === 1) {
    return `${year - 1}-12`;
  }

  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

function buildSummaryComparison(current: number, previous: number) {
  const delta = current - previous;
  const ratio = previous !== 0 ? (delta / Math.abs(previous)) * 100 : null;

  return {
    delta,
    ratio,
  };
}

export default function DRE() {
  const { currentProject, getRLSFilteredData, setTransactions, dreRules, setDRERules } = useApp();
  const { user } = useAuth();
  const [periodGranularity, setPeriodGranularity] = useState<PeriodGranularity>("month");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [dreAudit, setDreAudit] = useState<AuditReport | null>(null);
  const [transactionsAudit, setTransactionsAudit] = useState<AuditReport | null>(null);

  const visibleTransactions = useMemo(
    () => getRLSFilteredData(user?.role ?? "user"),
    [getRLSFilteredData, user?.role],
  );

  const periodOptions = useMemo(() => {
    const map = new Map<string, PeriodOption>();

    visibleTransactions.forEach((transaction) => {
      const option = getPeriodOption(transaction.date, periodGranularity);
      map.set(option.value, option);
    });

    return Array.from(map.values()).sort((left, right) => right.sortKey - left.sortKey);
  }, [periodGranularity, visibleTransactions]);

  useEffect(() => {
    if (periodOptions.length === 0) {
      setSelectedPeriod("all");
      return;
    }

    if (selectedPeriod === "all" || !periodOptions.some((option) => option.value === selectedPeriod)) {
      setSelectedPeriod(periodOptions[0].value);
    }
  }, [periodOptions, selectedPeriod]);

  const selectedPeriodOption = useMemo(
    () => periodOptions.find((option) => option.value === selectedPeriod) ?? null,
    [periodOptions, selectedPeriod],
  );
  const comparisonPeriodValue = useMemo(
    () => (selectedPeriod !== "all" ? getPreviousPeriodValue(selectedPeriod, periodGranularity) : null),
    [periodGranularity, selectedPeriod],
  );
  const comparisonPeriodOption = useMemo(
    () => periodOptions.find((option) => option.value === comparisonPeriodValue) ?? null,
    [comparisonPeriodValue, periodOptions],
  );

  const deliveryTransactions = useMemo(() => {
    if (selectedPeriod === "all") {
      return visibleTransactions;
    }

    return visibleTransactions.filter(
      (transaction) => getPeriodOption(transaction.date, periodGranularity).value === selectedPeriod,
    );
  }, [periodGranularity, selectedPeriod, visibleTransactions]);

  const comparisonTransactions = useMemo(() => {
    if (!comparisonPeriodValue) {
      return [];
    }

    return visibleTransactions.filter(
      (transaction) => getPeriodOption(transaction.date, periodGranularity).value === comparisonPeriodValue,
    );
  }, [comparisonPeriodValue, periodGranularity, visibleTransactions]);

  const transactionValidationReport = useMemo(
    () => validateTransactions(deliveryTransactions),
    [deliveryTransactions],
  );
  const dreValidationReport = useMemo(
    () => validateDRETransactions(deliveryTransactions, dreRules),
    [deliveryTransactions, dreRules],
  );
  const mergedValidationReport = useMemo(
    () => mergeValidationReports(transactionValidationReport, dreValidationReport),
    [dreValidationReport, transactionValidationReport],
  );

  const dreReport = useMemo(
    () => buildDREReport(deliveryTransactions, dreRules),
    [deliveryTransactions, dreRules],
  );
  const comparisonReport = useMemo(
    () => (comparisonTransactions.length > 0 ? buildDREReport(comparisonTransactions, dreRules) : null),
    [comparisonTransactions, dreRules],
  );

  const trendData = useMemo(() => {
    const grouped = visibleTransactions.reduce<Record<string, { label: string; sortKey: number; entries: typeof visibleTransactions }>>(
      (acc, transaction) => {
        const option = getPeriodOption(transaction.date, periodGranularity);
        const current = acc[option.value];

        acc[option.value] = current
          ? { ...current, entries: [...current.entries, transaction] }
          : { label: option.label, sortKey: option.sortKey, entries: [transaction] };

        return acc;
      },
      {},
    );

    return Object.values(grouped)
      .map((group) => {
        const report = buildDREReport(group.entries, dreRules);
        return {
          label: group.label,
          sortKey: group.sortKey,
          receitaLiquida: report.summary.receitaLiquida,
          ebitda: report.summary.ebitda,
          resultadoLiquido: report.summary.resultadoLiquido,
        };
      })
      .sort((left, right) => left.sortKey - right.sortKey);
  }, [dreRules, periodGranularity, visibleTransactions]);

  const summaryCards = [
    {
      label: "Receita Líquida",
      value: dreReport.summary.receitaLiquida,
      previous: comparisonReport?.summary.receitaLiquida ?? 0,
      color: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200",
    },
    {
      label: "Lucro Bruto",
      value: dreReport.summary.lucroBruto,
      previous: comparisonReport?.summary.lucroBruto ?? 0,
      color: "text-blue-700",
      bg: "bg-blue-50 border-blue-200",
    },
    {
      label: "EBITDA",
      value: dreReport.summary.ebitda,
      previous: comparisonReport?.summary.ebitda ?? 0,
      color: "text-violet-700",
      bg: "bg-violet-50 border-violet-200",
    },
    {
      label: "Resultado Líquido",
      value: dreReport.summary.resultadoLiquido,
      previous: comparisonReport?.summary.resultadoLiquido ?? 0,
      color: dreReport.summary.resultadoLiquido >= 0 ? "text-emerald-700" : "text-rose-700",
      bg: dreReport.summary.resultadoLiquido >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200",
    },
  ];

  const currentPeriodLabel = selectedPeriodOption?.label ?? "Consolidado geral";
  const comparisonPeriodLabel = comparisonPeriodOption?.label ?? null;
  const baseForPercentage = Math.abs(dreReport.summary.receitaLiquida) || Math.abs(dreReport.summary.receitaBruta) || 1;
  const isApproved = mergedValidationReport.approved;

  const handleRunAudit = async () => {
    setAuditLoading(true);
    const result = await performFullAudit(dreReport, visibleTransactions);
    setDreAudit(result.dre);
    setTransactionsAudit(result.transactions);
    setAuditLoading(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link to="/home" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">DRE Gerencial</h1>
            <p className="text-sm text-muted-foreground">
              Entrega estruturada, comparável e auditável
              {currentProject ? ` — ${currentProject.name}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DREDataGuide />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBenchmark(true)}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <BarChart3 className="h-4 w-4 mr-1" /> Benchmark B3
          </Button>
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => {
              const mock = generateMockTransactions();
              void setTransactions(mock);
            }}
          >
            <Database className="h-4 w-4 mr-1" /> Dados Demo
          </Button>
          <DREExportButton
            projectName={currentProject?.name}
            periodLabel={currentPeriodLabel}
            dreReport={dreReport}
            comparisonLabel={comparisonPeriodLabel}
            comparisonReport={comparisonReport}
            transactions={deliveryTransactions}
          />
          <ExportButton data={deliveryTransactions} />
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-1" /> Dashboard Analítico
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Período e comparativo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Granularidade</p>
            <Select value={periodGranularity} onValueChange={(value) => setPeriodGranularity(value as PeriodGranularity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mensal</SelectItem>
                <SelectItem value="quarter">Trimestral</SelectItem>
                <SelectItem value="year">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Período atual</p>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={periodOptions.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um período" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Entrega atual</p>
            <p className="mt-2 font-semibold text-slate-900">{currentPeriodLabel}</p>
            <p className="mt-2 text-sm text-slate-600">{deliveryTransactions.length} lançamentos no período selecionado</p>
          </div>

          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Comparação automática</p>
            <p className="mt-2 font-semibold text-slate-900">{comparisonPeriodLabel ?? "Sem período anterior disponível"}</p>
            <p className="mt-2 text-sm text-slate-600">
              {comparisonPeriodLabel
                ? `${comparisonTransactions.length} lançamentos usados no comparativo.`
                : "Selecione outro período quando houver histórico anterior."}
            </p>
          </div>
        </CardContent>
      </Card>

      {visibleTransactions.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-8 text-center">
            <Database className="h-10 w-10 mx-auto text-amber-600 mb-3" />
            <h2 className="text-xl font-semibold text-amber-900 mb-2">Nenhum dado financeiro disponível</h2>
            <p className="text-sm text-amber-700 mb-4">
              Importe uma planilha ou carregue dados demo para gerar a entrega DRE.
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
                  const mock = generateMockTransactions();
                  void setTransactions(mock);
                }}
              >
                <Database className="h-4 w-4 mr-2" /> Usar Dados Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <DRERulesManager
        projectId={currentProject?.id}
        transactions={visibleTransactions}
        rules={dreRules}
        onChange={setDRERules}
      />

      {deliveryTransactions.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ValidationSummary report={transactionValidationReport} title="Validação dos lançamentos do período" />
          <ValidationSummary report={dreValidationReport} title="Validação contábil do DRE" />
        </div>
      )}

      {!isApproved && deliveryTransactions.length > 0 && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-5 text-sm text-rose-700">
            A entrega DRE deste período foi bloqueada porque a validação encontrou inconsistências críticas nos lançamentos ou na estrutura contábil.
          </CardContent>
        </Card>
      )}

      {isApproved && deliveryTransactions.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {summaryCards.map((card) => {
              const comparison = buildSummaryComparison(card.value, card.previous);

              return (
                <Card key={card.label} className={`border ${card.bg}`}>
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
                    <p className={`text-2xl font-bold mt-2 ${card.color}`}>{formatCurrency(card.value)}</p>
                    {comparisonReport ? (
                      <p className="mt-2 text-xs text-slate-600">
                        vs {comparisonPeriodLabel}: {formatCurrency(comparison.delta)}
                        {comparison.ratio !== null ? ` (${comparison.ratio.toFixed(1)}%)` : ""}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">Sem período anterior para comparativo.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Demonstrativo de Resultado do Exercício</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Linha</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">{currentPeriodLabel}</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">
                          {comparisonPeriodLabel ?? "Período anterior"}
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">Variação</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">% da Receita Líquida</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dreReport.lines.map((line) => {
                        const previousLine = comparisonReport?.lines.find((entry) => entry.label === line.label);
                        const delta = line.amount - (previousLine?.amount ?? 0);
                        const percentage = (line.amount / baseForPercentage) * 100;

                        return (
                          <tr
                            key={line.label}
                            className={line.kind === "result" ? "bg-slate-50 font-semibold" : "border-b last:border-b-0"}
                          >
                            <td className="px-3 py-3 text-slate-900">{line.label}</td>
                            <td className={`px-3 py-3 text-right font-medium ${line.amount >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                              {formatCurrency(line.amount)}
                            </td>
                            <td className="px-3 py-3 text-right text-slate-600">
                              {previousLine ? formatCurrency(previousLine.amount) : "-"}
                            </td>
                            <td className={`px-3 py-3 text-right ${delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                              {comparisonReport ? formatCurrency(delta) : "-"}
                            </td>
                            <td className="px-3 py-3 text-right text-slate-600">
                              {Number.isFinite(percentage) ? `${percentage.toFixed(1)}%` : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estrutura de Entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Entrega principal</p>
                  <p className="font-semibold text-slate-900 mt-1">DRE consolidado e auditável</p>
                  <p className="text-sm text-slate-600 mt-2">
                    Período selecionado pronto para leitura executiva, comparativo e rastreio por lançamentos.
                  </p>
                </div>

                <div className="space-y-2">
                  {dreReport.groupTotals.map((group) => (
                    <div key={group.group} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0">
                      <span className="text-slate-600">{group.group}</span>
                      <span className={group.amount >= 0 ? "text-emerald-700 font-medium" : "text-rose-700 font-medium"}>
                        {formatCurrency(group.amount)}
                      </span>
                    </div>
                  ))}
                </div>

                <Link to="/detail">
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" /> Ver Lançamentos Auditáveis
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Evolução {periodGranularity === "month" ? "Mensal" : periodGranularity === "quarter" ? "Trimestral" : "Anual"} do Resultado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="receitaLiquida" name="Receita Líquida" stroke="#059669" strokeWidth={2} />
                  <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#7c3aed" strokeWidth={2} />
                  <Line type="monotone" dataKey="resultadoLiquido" name="Resultado Líquido" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* Benchmark Dialog */}
      <BenchmarkDialog
        open={showBenchmark}
        onClose={() => setShowBenchmark(false)}
        userMetrics={{
          revenue: dreReport.summary.receitaLiquida,
          grossProfit: dreReport.summary.lucroBruto,
          operatingIncome: dreReport.summary.ebitda,
          profitMargin: (dreReport.summary.resultadoLiquido / dreReport.summary.receitaBruta) * 100 || 0,
        }}
      />
    </div>
  );
}
