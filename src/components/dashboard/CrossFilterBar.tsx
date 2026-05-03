import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartCard } from './ChartCard';

interface CrossFilterBarProps {
  data: { name: string; value: number }[];
  title: string;
  selected: string | null;
  onSelect: (name: string | null) => void;
  color?: string;
}

export default function CrossFilterBar({ data, title, selected, onSelect, color = '#3b82f6' }: CrossFilterBarProps) {
  const sorted = useMemo(() => data.sort((a, b) => b.value - a.value), [data]);

  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={sorted} margin={{ top: 5, right: 5, left: 5, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" angle={-35} textAnchor="end" fontSize={10} height={60} />
          <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} fontSize={10} />
          <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            onClick={(e: any) => onSelect(selected === e.name ? null : e.name)}
          >
            {sorted.map((entry, index) => (
              <rect
                key={index}
                fill={selected === null || selected === entry.name ? color : '#d1d5db'}
                rx={4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {selected && (
        <div className="flex items-center gap-2 mt-2 px-2">
          <span className="text-xs text-muted-foreground">Filtrado: {selected}</span>
          <button onClick={() => onSelect(null)} className="text-xs text-blue-600 hover:underline">Limpar</button>
        </div>
      )}
    </ChartCard>
  );
}
