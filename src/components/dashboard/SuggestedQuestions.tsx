import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, TrendingDown, PiggyBank, BarChart3, PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  context?: {
    categories: string[];
    period: string;
  };
}

const BASE_QUESTIONS: {
  text: string;
  categories: ("geral" | "receita" | "despesa" | "tendencia" | "categoria" | "margem" | "distribuicao" | "centro")[];
  icon: React.ElementType;
}[] = [
  {
    text: "Qual a receita total?",
    categories: ["geral", "receita"],
    icon: TrendingUp,
  },
  {
    text: "Top 5 despesas?",
    categories: ["geral", "despesa"],
    icon: TrendingDown,
  },
  {
    text: "Evolução mensal da receita?",
    categories: ["geral", "tendencia", "receita"],
    icon: BarChart3,
  },
  {
    text: "Compare receita vs despesa?",
    categories: ["geral", "receita", "despesa"],
    icon: BarChart3,
  },
  {
    text: "Qual centro de custo gasta mais?",
    categories: ["geral", "centro", "despesa"],
    icon: PiggyBank,
  },
  {
    text: "Margem operacional?",
    categories: ["geral", "margem"],
    icon: PieChart,
  },
  {
    text: "Tendência dos últimos meses?",
    categories: ["geral", "tendencia"],
    icon: TrendingUp,
  },
  {
    text: "Distribuição por categoria?",
    categories: ["geral", "categoria", "distribuicao"],
    icon: PieChart,
  },
  {
    text: "Categorias com maior crescimento?",
    categories: ["receita", "categoria", "tendencia"],
    icon: TrendingUp,
  },
  {
    text: "Despesas acima da média?",
    categories: ["despesa", "centro"],
    icon: TrendingDown,
  },
  {
    text: "Saldo líquido por mês?",
    categories: ["geral", "tendencia"],
    icon: BarChart3,
  },
  {
    text: "Ranking de centros de custo?",
    categories: ["centro", "despesa"],
    icon: PiggyBank,
  },
];

export default function SuggestedQuestions({
  onSelect,
  context,
}: SuggestedQuestionsProps) {
  const filteredQuestions = useMemo(() => {
    if (!context?.categories.length) return BASE_QUESTIONS;

    return BASE_QUESTIONS.filter((q) => {
      if (
        context.categories.length === 0 &&
        q.categories.includes("geral")
      ) {
        return true;
      }
      if (
        q.categories.some((c) =>
          context.categories.map((x) => x.toLowerCase()).includes(c)
        )
      ) {
        return true;
      }
      return q.categories.includes("geral");
    });
  }, [context]);

  const iconColor = (categories: string[]) => {
    if (categories.includes("receita")) return "text-emerald-500";
    if (categories.includes("despesa")) return "text-rose-500";
    if (categories.includes("margem")) return "text-violet-500";
    if (categories.includes("tendencia")) return "text-blue-500";
    if (categories.includes("centro")) return "text-amber-500";
    return "text-slate-500";
  };

  const chipColor = (categories: string[]) => {
    if (categories.includes("receita"))
      return "border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 text-emerald-700";
    if (categories.includes("despesa"))
      return "border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-rose-700";
    if (categories.includes("margem"))
      return "border-violet-200 hover:bg-violet-50 hover:border-violet-300 text-violet-700";
    if (categories.includes("tendencia"))
      return "border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-blue-700";
    if (categories.includes("centro"))
      return "border-amber-200 hover:bg-amber-50 hover:border-amber-300 text-amber-700";
    return "border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600";
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50/60 to-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-blue-500" />
          Perguntas Sugeridas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {filteredQuestions.map((q, i) => (
            <motion.div
              key={q.text}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: i * 0.06,
                duration: 0.3,
                ease: "easeOut",
              }}
            >
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-full text-xs font-medium transition-all cursor-pointer",
                  "border h-auto py-1.5 px-3",
                  chipColor(q.categories)
                )}
                onClick={() => onSelect(q.text)}
              >
                <q.icon className={cn("w-3.5 h-3.5 mr-1.5", iconColor(q.categories))} />
                {q.text}
              </Button>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
