import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiData } from "@/hooks/useDashboardData";

interface SmartNarrativeProps {
  kpis: KpiData;
  topCategories: { name: string; value: number }[];
  monthlyData: { month: string; income: number; expense: number }[];
}

export const SmartNarrative = ({ kpis, topCategories, monthlyData }: SmartNarrativeProps) => {
  const narrative = useMemo(() => {
    const parts: string[] = [];
    
    parts.push(`A receita total foi de ${kpis.income.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
    
    if (kpis.incomeTrend > 0) {
      parts.push(`, ${kpis.incomeTrend.toFixed(1)}% acima do período anterior`);
    } else if (kpis.incomeTrend < 0) {
      parts.push(`, ${Math.abs(kpis.incomeTrend).toFixed(1)}% abaixo do período anterior`);
    }
    
    parts.push(`. A despesa total foi de ${kpis.expense.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
    
    if (topCategories.length > 0) {
      parts.push(`. A maior categoria de despesa foi ${topCategories[0].name} (${topCategories[0].value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`);
    }
    
    if (monthlyData.length > 1) {
      const last = monthlyData[monthlyData.length - 1];
      const prev = monthlyData[monthlyData.length - 2];
      const balanceChange = prev.balance > 0 ? ((last.balance - prev.balance) / Math.abs(prev.balance)) * 100 : 0;
      if (Math.abs(balanceChange) > 5) {
        parts.push(`. O saldo do último mês ${balanceChange > 0 ? "cresceu" : "caiu"} ${Math.abs(balanceChange).toFixed(1)}% em relação ao anterior`);
      }
    }
    
    parts.push(`. Margem operacional de ${kpis.margin.toFixed(1)}%.`);
    
    return parts.join("");
  }, [kpis, topCategories, monthlyData]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-emerald-800 mb-1">Insight Automático</p>
              <p className="text-sm text-emerald-900 leading-relaxed">{narrative}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

import { useMemo } from "react";