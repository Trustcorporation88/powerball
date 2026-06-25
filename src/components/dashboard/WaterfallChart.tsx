import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { ChartCard } from './ChartCard';
import { useApp } from '@/contexts/AppContext';

interface WaterfallChartProps {
  title: string;
}

export default function WaterfallChart({ title }: WaterfallChartProps) {
  const { transactions } = useApp();

  const data = useMemo(() => {
    const income = transactions.filter(t => t.flowType === 'income').reduce((s, t) => s + t.value, 0);
    const expense = transactions.filter(t => t.flowType === 'expense').reduce((s, t) => s + t.value, 0);

    const topExpenses = transactions
      .filter(t => t.flowType === 'expense')
      .reduce((acc: { name: string; value: number }[], t) => {
        const existing = acc.find(a => a.name === t.category);
        if (existing) existing.value += t.value;
        else acc.push({ name: t.category, value: t.value });
        return acc;
      }, [])
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const result: any[] = [{ name: 'Receita', value: income, fill: '#059669' }];
    topExpenses.forEach(e => result.push({ name: e.name, value: -e.value, fill: '#ef4444' }));
    result.push({ name: 'Saldo', value: income - expense, fill: income - expense >= 0 ? '#3b82f6' : '#ef4444' });

    return result;
  }, [transactions]);

  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" angle={-35} textAnchor="end" fontSize={10} height={60} />
          <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} fontSize={10} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
