import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AdvancedMetricsDialogProps {
  receitaBruta: number;
  receitaLiquida: number;
  lucroBruto: number;
  ebitda: number;
  resultadoLiquido: number;
  custos: number;
  despesasOperacionais: number;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function AdvancedMetricsDialog({
  receitaBruta,
  receitaLiquida,
  lucroBruto,
  ebitda,
  resultadoLiquido,
  custos,
  despesasOperacionais,
}: AdvancedMetricsDialogProps) {
  // Cálculo das margens
  const margemBruta = receitaLiquida !== 0 ? (lucroBruto / receitaLiquida) * 100 : null;
  const margemEbitda = receitaLiquida !== 0 ? (ebitda / receitaLiquida) * 100 : null;
  const margemLiquida = receitaLiquida !== 0 ? (resultadoLiquido / receitaLiquida) * 100 : null;

  // Ponto de equilíbrio (Custos + Despesas)
  const pontoEquilibrio = Math.abs(custos) + Math.abs(despesasOperacionais);
  const distanciaPontoEquilibrio = receitaLiquida - pontoEquilibrio;
  const percentualAcimaEquilibrio = pontoEquilibrio !== 0 ? (distanciaPontoEquilibrio / pontoEquilibrio) * 100 : null;

  // Eficiência operacional
  const eficienciaOperacional = receitaLiquida !== 0 ? (Math.abs(despesasOperacionais) / receitaLiquida) * 100 : null;

  // Ticket médio por transação (simulado - em produção seria transactions.length)
  const markup = custos !== 0 ? ((receitaLiquida - Math.abs(custos)) / Math.abs(custos)) * 100 : null;

  const metrics = [
    {
      category: "📊 Margens",
      items: [
        {
          label: "Margem Bruta",
          value: formatPercent(margemBruta),
          description: "Lucro Bruto / Receita Líquida",
          color: margemBruta && margemBruta > 40 ? "text-emerald-700" : margemBruta && margemBruta > 20 ? "text-blue-700" : "text-amber-700",
          benchmark: "> 40% = Excelente | 20-40% = Bom | < 20% = Atenção",
        },
        {
          label: "Margem EBITDA",
          value: formatPercent(margemEbitda),
          description: "EBITDA / Receita Líquida",
          color: margemEbitda && margemEbitda > 20 ? "text-emerald-700" : margemEbitda && margemEbitda > 10 ? "text-blue-700" : "text-amber-700",
          benchmark: "> 20% = Excelente | 10-20% = Bom | < 10% = Atenção",
        },
        {
          label: "Margem Líquida",
          value: formatPercent(margemLiquida),
          description: "Resultado Líquido / Receita Líquida",
          color: margemLiquida && margemLiquida > 15 ? "text-emerald-700" : margemLiquida && margemLiquida > 5 ? "text-blue-700" : margemLiquida && margemLiquida > 0 ? "text-amber-700" : "text-rose-700",
          benchmark: "> 15% = Excelente | 5-15% = Bom | < 5% = Atenção",
        },
      ],
    },
    {
      category: "⚖️ Ponto de Equilíbrio",
      items: [
        {
          label: "Ponto de Equilíbrio",
          value: formatCurrency(pontoEquilibrio),
          description: "Receita necessária para cobrir Custos + Despesas",
          color: "text-slate-700",
          benchmark: "Receita acima deste valor = lucro operacional",
        },
        {
          label: "Distância do Equilíbrio",
          value: formatCurrency(distanciaPontoEquilibrio),
          description: "Quanto acima (+) ou abaixo (-) do ponto de equilíbrio",
          color: distanciaPontoEquilibrio >= 0 ? "text-emerald-700" : "text-rose-700",
          benchmark: distanciaPontoEquilibrio >= 0 ? "✅ Acima do equilíbrio" : "⚠️ Abaixo do equilíbrio",
        },
        {
          label: "% Acima/Abaixo Equilíbrio",
          value: formatPercent(percentualAcimaEquilibrio),
          description: "Folga/Déficit em relação ao ponto de equilíbrio",
          color: percentualAcimaEquilibrio && percentualAcimaEquilibrio >= 0 ? "text-emerald-700" : "text-rose-700",
          benchmark: "> 20% = Folga saudável | 0-20% = Margem apertada",
        },
      ],
    },
    {
      category: "⚡ Eficiência",
      items: [
        {
          label: "Eficiência Operacional",
          value: formatPercent(eficienciaOperacional),
          description: "Despesas Operacionais / Receita Líquida",
          color: eficienciaOperacional && eficienciaOperacional < 30 ? "text-emerald-700" : eficienciaOperacional && eficienciaOperacional < 50 ? "text-blue-700" : "text-amber-700",
          benchmark: "< 30% = Eficiente | 30-50% = Razoável | > 50% = Atenção",
        },
        {
          label: "Markup sobre Custos",
          value: formatPercent(markup),
          description: "(Receita Líquida - Custos) / Custos",
          color: markup && markup > 100 ? "text-emerald-700" : markup && markup > 50 ? "text-blue-700" : "text-amber-700",
          benchmark: "> 100% = Ótimo | 50-100% = Bom | < 50% = Revisar",
        },
      ],
    },
    {
      category: "💰 Composição de Custos",
      items: [
        {
          label: "Custos / Receita",
          value: formatPercent(receitaLiquida !== 0 ? (Math.abs(custos) / receitaLiquida) * 100 : null),
          description: "Peso dos custos diretos na receita",
          color: "text-blue-700",
          benchmark: "Quanto menor, melhor a eficiência produtiva",
        },
        {
          label: "Despesas / Receita",
          value: formatPercent(receitaLiquida !== 0 ? (Math.abs(despesasOperacionais) / receitaLiquida) * 100 : null),
          description: "Peso das despesas administrativas na receita",
          color: "text-purple-700",
          benchmark: "Quanto menor, melhor a eficiência administrativa",
        },
      ],
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Indicadores Avançados
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
            Indicadores Financeiros Avançados
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Métricas detalhadas para análise profunda da performance financeira
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {metrics.map((category) => (
            <div key={category.category}>
              <h3 className="font-bold text-lg mb-3 text-slate-900">{category.category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items.map((metric) => (
                  <Card key={metric.label} className="border-slate-200 hover:border-slate-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            {metric.label}
                          </p>
                          <p className={`text-2xl font-bold mt-1 ${metric.color}`}>
                            {metric.value}
                          </p>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-slate-400 hover:text-slate-600 cursor-help shrink-0 mt-1" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold mb-1">{metric.description}</p>
                              <p className="text-xs text-slate-300">{metric.benchmark}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                        {metric.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Legenda de cores */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Interpretação das cores:</p>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-slate-600">Excelente</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-slate-600">Bom</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-slate-600">Atenção</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <span className="text-slate-600">Crítico</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
