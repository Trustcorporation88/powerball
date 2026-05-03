import { Card } from "@/components/ui/card";

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  total?: number;
  formatter?: (value: number) => string;
}

export const CustomTooltip = ({ active, payload, label, total, formatter }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const format = formatter || ((v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

  return (
    <Card className="p-3 border-slate-200 shadow-lg bg-white/95 backdrop-blur">
      <p className="font-semibold text-slate-900 text-sm mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, i) => {
          const percentage = total && total > 0 ? ((entry.value / total) * 100).toFixed(1) : null;
          return (
            <div key={i} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-600">{entry.name}</span>
              </div>
              <div className="text-right">
                <span className="font-medium text-slate-900">{format(entry.value)}</span>
                {percentage && (
                  <span className="ml-2 text-slate-400">({percentage}%)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};