import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Wallet, PiggyBank, Percent, Receipt, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiData } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, LineChart, Line } from "recharts";

interface KpiCardsProps {
  kpis: KpiData;
  monthlyData: { month: string; income: number; expense: number; balance: number }[];
}

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatPercent = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

const Sparkline = ({ data, color }: { data: { value: number }[]; color: string }) => (
  <div className="w-20 h-8">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export const KpiCards = ({ kpis, monthlyData }: KpiCardsProps) => {
  const cards = [
    {
      title: "Receita Total",
      value: formatCurrency(kpis.income),
      trend: kpis.incomeTrend,
      icon: Wallet,
      color: "emerald",
      data: monthlyData.map((d) => ({ value: d.income })),
    },
    {
      title: "Despesa Total",
      value: formatCurrency(kpis.expense),
      trend: kpis.expenseTrend,
      icon: Receipt,
      color: "rose",
      data: monthlyData.map((d) => ({ value: d.expense })),
    },
    {
      title: "Saldo Líquido",
      value: formatCurrency(kpis.balance),
      trend: kpis.balanceTrend,
      icon: PiggyBank,
      color: "blue",
      data: monthlyData.map((d) => ({ value: d.balance })),
    },
    {
      title: "Margem Operacional",
      value: `${kpis.margin.toFixed(1)}%`,
      trend: kpis.marginTrend,
      icon: Percent,
      color: "violet",
      data: monthlyData.map((d) => ({ value: d.balance })),
    },
  ];

  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
  };

  const iconBgMap = {
    emerald: "bg-emerald-100",
    blue: "bg-blue-100",
    amber: "bg-amber-100",
    rose: "bg-rose-100",
    violet: "bg-violet-100",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className={cn("rounded-xl border transition-shadow hover:shadow-md", colorMap[card.color as keyof typeof colorMap])}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5 flex-1">
                  <p className="text-xs font-medium opacity-70">{card.title}</p>
                  <p className="text-xl font-bold">{card.value}</p>
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    {card.trend > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : card.trend < 0 ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                    <span className={cn(
                      card.trend > 0 ? "text-emerald-600" : card.trend < 0 ? "text-rose-600" : "text-slate-500"
                    )}>
                      {formatPercent(card.trend)} vs período anterior
                    </span>
                  </div>
                  <p className="text-[10px] opacity-60">{kpis.transactionCount} lançamentos</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={cn("p-2 rounded-lg", iconBgMap[card.color as keyof typeof iconBgMap])}>
                    <card.icon className="w-4 h-4" />
                  </div>
                  {card.data.length > 1 && (
                    <Sparkline data={card.data} color={card.color === "emerald" ? "#10b981" : card.color === "rose" ? "#ef4444" : card.color === "blue" ? "#3b82f6" : "#8b5cf6"} />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};