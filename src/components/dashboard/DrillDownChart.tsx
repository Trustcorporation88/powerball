import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartCard } from './ChartCard';
import { useApp } from '@/contexts/AppContext';
import { useMemo } from 'react';

interface DrillDownChartProps {
  category: string | null;
  onBack: () => void;
}

export default function DrillDownChart({ category, onBack }: DrillDownChartProps) {
  const { transactions } = useApp();

  const data = useMemo(() => {
    if (!category) return [];

    const filtered = transactions.filter(t => t.category === category);
    const monthly: Record<string, { income: number; expense: number }> = {};

    filtered.forEach(t => {
      const month = t.date?.slice(0, 7) || 'N/A';
      if (!monthly[month]) monthly[month] = { income: 0, expense: 0 };
      if (t.flowType === 'income') monthly[month].income += t.value;
      else monthly[month].expense += t.value;
    });

    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({
        month: month.slice(5) + '/' + month.slice(0, 4),
        income: values.income,
        expense: values.expense,
      }));
  }, [category, transactions]);

  if (!category) return null;

  return (
    <ChartCard title={`Drill-down: ${category}`}>
      <button onClick={onBack} className="text-xs text-blue-600 hover:underline mb-2">
        ← Voltar ao resumo
      </button>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" fontSize={10} />
          <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} fontSize={10} />
          <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
          <Legend />
          <Area type="monotone" dataKey="income" name="Receita" stroke="#059669" fill="#059669" fillOpacity={0.1} />
          <Area type="monotone" dataKey="expense" name="Despesa" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
