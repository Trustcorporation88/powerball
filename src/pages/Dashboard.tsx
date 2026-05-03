import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { CustomTooltip } from "@/components/dashboard/CustomTooltip";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";
import { FocusMode } from "@/components/dashboard/FocusMode";
import { SmartNarrative } from "@/components/dashboard/SmartNarrative";
import { DecompositionTree } from "@/components/dashboard/DecompositionTree";
import { NaturalLanguageQuery } from "@/components/dashboard/NaturalLanguageQuery";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import {
  ArrowLeft,
  Eye,
  BarChart3,
  PieChart,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

const EmptyChart = ({ message }: { message: string }) => (
  <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 gap-2">
    <AlertCircle className="w-8 h-8 text-slate-300" />
    <p className="text-sm">{message}</p>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { transactions, currentProject } = useApp();
  
  const [filters, setFilters] = useState({
    period: "all",
    category: "all",
    costCenter: "all",
    search: "",
  });
  
  const [focusChart, setFocusChart] = useState<{ title: string; content: React.ReactNode } | null>(null);

  const {
    filteredTransactions,
    kpis,
    monthlyData,
    categoryData,
    costCenterData,
    categories,
    costCenters,
    topCategories,
  } = useDashboardData(transactions, filters);

  const totalExpense = useMemo(() => categoryData.reduce((s, c) => s + c.value, 0), [categoryData]);

  const monthlyChart = monthlyData.length > 1 ? (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={monthlyData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />} />
        <Legend />
        <Line type="monotone" dataKey="income" name="Receita" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="expense" name="Despesa" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  ) : (
    <EmptyChart message="Dados insuficientes — mínimo 2 meses para evolução" />
  );

  const categoryChart = categoryData.length > 0 ? (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={categoryData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip total={totalExpense} formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />} />
        <Bar dataKey="value" name="Valor" radius={[4, 4, 0, 0]}>
          {categoryData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  ) : (
    <EmptyChart message="Nenhuma categoria de despesa encontrada" />
  );

  const costCenterChart = costCenterData.length > 0 ? (
    <ResponsiveContainer width="100%" height={250}>
      <RePieChart>
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
      </RePieChart>
    </ResponsiveContainer>
  ) : (
    <EmptyChart message="Nenhum centro de custo encontrado" />
  );

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
          <ThemeToggle />
          <ExportButton transactions={filteredTransactions} filename={currentProject?.name || "dashboard"} />
          <Button variant="outline" size="sm" onClick={() => navigate("/detail")}>
            <Eye className="w-4 h-4 mr-2" />
            Detalhes
          </Button>
        </div>
      </div>

      <DashboardFilters
        categories={categories}
        costCenters={costCenters}
        filters={filters}
        onChange={setFilters}
      />

      <SmartNarrative kpis={kpis} topCategories={topCategories} monthlyData={monthlyData} />

      <KpiCards kpis={kpis} monthlyData={monthlyData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Evolução Mensal"
          onFocus={() => setFocusChart({ title: "Evolução Mensal", content: monthlyChart })}
          delay={0.1}
        >
          {monthlyChart}
        </ChartCard>

        <ChartCard
          title="Despesas por Categoria"
          onFocus={() => setFocusChart({ title: "Despesas por Categoria", content: categoryChart })}
          delay={0.2}
        >
          {categoryChart}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Composição por Centro de Custo"
          className="lg:col-span-1"
          onFocus={() => setFocusChart({ title: "Composição por Centro de Custo", content: costCenterChart })}
          delay={0.3}
        >
          {costCenterData.length === 1 ? (
            <div className="space-y-4">
              {costCenterChart}
              <div className="text-center">
                <p className="text-sm text-slate-600 font-medium">{costCenterData[0].name}</p>
                <p className="text-lg font-bold text-emerald-700">
                  {costCenterData[0].value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <p className="text-xs text-slate-400 mt-1">100% do total</p>
              </div>
            </div>
          ) : (
            costCenterChart
          )}
        </ChartCard>

        <div className="lg:col-span-2 space-y-6">
          <NaturalLanguageQuery transactions={filteredTransactions} />
          <DecompositionTree transactions={filteredTransactions} />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <TransactionsTable
          transactions={filteredTransactions}
          onRowClick={() => navigate("/detail")}
        />
      </motion.div>

      <FocusMode
        isOpen={!!focusChart}
        onClose={() => setFocusChart(null)}
        title={focusChart?.title || ""}
      >
        {focusChart?.content}
      </FocusMode>
    </div>
  );
}