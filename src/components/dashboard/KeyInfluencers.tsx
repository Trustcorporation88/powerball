import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart3, HelpCircle, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Transaction } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface KeyInfluencersProps {
  transactions: Transaction[];
  targetMetric: "income" | "expense" | "balance";
}

interface Influencer {
  name: string;
  value: number;
  percentage: number;
  impact: "positive" | "negative" | "neutral";
  contribution: number;
}

const formatCurrency = (v: number) =>
  Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function KeyInfluencers({
  transactions,
  targetMetric,
}: KeyInfluencersProps) {
  const influencers = useMemo(() => {
    if (transactions.length === 0) return [];

    let relevantTransactions: Transaction[];
    let total: number;

    switch (targetMetric) {
      case "income":
        relevantTransactions = transactions.filter(
          (t) => t.flowType === "income"
        );
        total = relevantTransactions.reduce((s, t) => s + t.value, 0);
        break;
      case "expense":
        relevantTransactions = transactions.filter(
          (t) => t.flowType === "expense"
        );
        total = relevantTransactions.reduce((s, t) => s + Math.abs(t.value), 0);
        break;
      case "balance":
      default: {
        const income = transactions
          .filter((t) => t.flowType === "income")
          .reduce((s, t) => s + t.value, 0);
        const expense = transactions
          .filter((t) => t.flowType === "expense")
          .reduce((s, t) => s + Math.abs(t.value), 0);
        total = Math.abs(income - expense);
        relevantTransactions = transactions;
        break;
      }
    }

    if (total === 0) return [];

    const byCategory: Record<string, number> = {};
    const byCostCenter: Record<string, number> = {};

    relevantTransactions.forEach((t) => {
      let val = Math.abs(t.value);
      if (targetMetric === "income") val = t.value;
      else if (targetMetric === "expense") val = Math.abs(t.value);
      else val = t.flowType === "income" ? t.value : -Math.abs(t.value);

      byCategory[t.category] = (byCategory[t.category] || 0) + val;
      byCostCenter[t.costCenter] = (byCostCenter[t.costCenter] || 0) + val;
    });

    const combined: Influencer[] = [
      ...Object.entries(byCategory)
        .filter(([_, v]) => Math.abs(v) > 0)
        .map(([name, value]) => ({
          name,
          value,
          percentage: (Math.abs(value) / total) * 100,
          impact:
            value > 0
              ? ("positive" as const)
              : value < 0
              ? ("negative" as const)
              : ("neutral" as const),
          contribution: value,
        })),
      ...Object.entries(byCostCenter)
        .filter(([_, v]) => Math.abs(v) > 0)
        .map(([name, value]) => ({
          name: `${name} (CC)`,
          value,
          percentage: (Math.abs(value) / total) * 100,
          impact:
            value > 0
              ? ("positive" as const)
              : value < 0
              ? ("negative" as const)
              : ("neutral" as const),
          contribution: value,
        })),
    ];

    return combined
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 10);
  }, [transactions, targetMetric]);

  const metricLabel =
    targetMetric === "income"
      ? "Receita"
      : targetMetric === "expense"
      ? "Despesa"
      : "Saldo";

  if (transactions.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-400" />
            Principais Influenciadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 text-center py-8">
            Nenhum dado disponível para análise
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-600" />
          Principais Influenciadores - {metricLabel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {influencers.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Sem influenciadores significativos para {metricLabel.toLowerCase()}
          </p>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="space-y-2 pr-2">
              {influencers.map((inf, i) => (
                <motion.div
                  key={inf.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {inf.impact === "positive" ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : inf.impact === "negative" ? (
                        <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      ) : (
                        <BarChart3 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="text-sm text-slate-700 truncate">
                        {inf.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          inf.impact === "positive"
                            ? "text-emerald-600"
                            : inf.impact === "negative"
                            ? "text-rose-600"
                            : "text-slate-500"
                        )}
                      >
                        {inf.impact === "positive" ? "+" : ""}
                        {formatCurrency(inf.contribution)}
                      </span>
                      <span className="text-[10px] text-slate-400 w-10 text-right">
                        {inf.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(inf.percentage, 100)}%`,
                      }}
                      transition={{
                        duration: 0.6,
                        delay: i * 0.08,
                        ease: "easeOut",
                      }}
                      className={cn(
                        "h-full rounded-full transition-all",
                        inf.impact === "positive"
                          ? "bg-emerald-400"
                          : inf.impact === "negative"
                          ? "bg-rose-400"
                          : "bg-slate-300"
                      )}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-slate-500">Impacto positivo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="text-[10px] text-slate-500">Impacto negativo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3 h-3 text-slate-300" />
            <span className="text-[10px] text-slate-400">Top 10</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
