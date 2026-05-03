import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { KpiCard } from "@/components/KpiCard";
import {
  ArrowLeft,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Percent,
  Calendar,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { transactions, currentProject } = useApp();
  const [periodFilter, setPeriodFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [costCenterFilter, setCostCenterFilter] = useState("all");

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (costCenterFilter !== "all" && t.costCenter !== costCenterFilter) return false;
      if (periodFilter !== "all") {
        const month = new Date(t.date).getMonth();
        if (periodFilter === "q1" && month > 2) return false;
        if (periodFilter === "q2" && (month < 3 || month > 5)) return false;
      }
      return true;
    });
  }, [transactions, periodFilter, categoryFilter, costCenterFilter]);

  const kpis = useMemo(() => {
    const income = filteredTransactions.filter((t) => t.flowType === "income").reduce((sum, t) => sum + t.value, 0);
    const expense = filteredTransactions.filter((t) => t.flowType === "expense").reduce((sum, t) => sum + Math.abs(t.value), 0);
    const balance = income - expense;
    const margin = income > 0 ? ((income - expense) / income) * 100 : 0;
    return {
      income,
      expense,
      balance,
      margin,
    };
  }, [filteredTransactions]);

  const monthlyData = useMemo(() => {
    const grouped: Record<string, { month: string; income: number; expense: number }> = {};
    filteredTransactions.forEach((t) => {
      const month = t.date.slice(0, 7);
      if (!grouped[month]) grouped[month] = { month, income: 0, expense: 0 };
      if (t.flowType === "income") grouped[month].income += t.value;
      else grouped[month].expense += Math.abs(t.value);
    });
    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredTransactions]);

  const categoryData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredTransactions.filter((t) => t.flowType === "expense").forEach((t) => {
      grouped[t.category] = (grouped[t.category] || 0) + Math.abs(t.value);
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredTransactions]);

  const costCenterData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      grouped[t.costCenter] = (grouped[t.costCenter] || 0) + (t.flowType === "income" ? t.value : -Math.abs(t.value));
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value: Math.abs(value) }));
  }, [filteredTransactions]);

  const categories = useMemo(() => [...new Set(transactions.map((t) => t.category))], [transactions]);
  const costCenters = useMemo(() => [...new Set(transactions.map((t) => t.costCenter))], [transactions]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate("/projects")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar aos projetos
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            {currentProject?.name || "Dashboard Financeiro"}
          </h1>
          <p className="text-slate-500 mt-1">Análise consolidada dos dados importados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info("Exportação em desenvolvimento")}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filtros Globais</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger>
                <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="q1">1º Trimestre</SelectItem>
                <SelectItem value="q2">2º Trimestre</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={costCenterFilter} onValueChange={setCostCenterFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Centro de Custo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os centros</SelectItem>
                {costCenters.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Receita Total"
          value={kpis.income.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          trend="up"
          trendValue="+12% vs mês anterior"
          icon={<Wallet className="w-5 h-5" />}
          color="emerald"
        />
        <KpiCard
          title="Despesa Total"
          value={kpis.expense.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          trend="down"
          trendValue="-5% vs mês anterior"
          icon={<TrendingDown className="w-5 h-5" />}
          color="rose"
        />
        <KpiCard
          title="Saldo Líquido"
          value={kpis.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          subtitle="Receita - Despesa"
          icon={<PiggyBank className="w-5 h-5" />}
          color="blue"
        />
        <KpiCard
          title="Margem Operacional"
          value={`${kpis.margin.toFixed(1)}%`}
          trend={kpis.margin > 0 ? "up" : "down"}
          trendValue="Meta: 20%"
          icon={<Percent className="w-5 h-5" />}
          color="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                <Legend />
                <Line type="monotone" dataKey="income" name="Receita" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="expense" name="Despesa" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                <Bar dataKey="value" name="Valor" radius={[4, 4, 0, 0]}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-slate-200 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Composição por Centro de Custo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={costCenterData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {costCenterData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Lançamentos Recentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/detail")}>
              <Eye className="w-4 h-4 mr-1" />
              Ver todos
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Descrição</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Categoria</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.slice(0, 8).map((t) => (
                    <tr
                      key={t.id}
                      className="border-b last:border-0 hover:bg-slate-50 cursor-pointer"
                      onClick={() => navigate("/detail")}
                    >
                      <td className="px-4 py-2.5 text-slate-600">{t.date}</td>
                      <td className="px-4 py-2.5 text-slate-900 font-medium">{t.description}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">{t.category}</span>
                      </td>
                      <td className={`px-4 py-2.5 text-right font-medium ${t.value >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {t.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}