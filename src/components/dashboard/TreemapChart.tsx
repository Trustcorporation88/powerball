import { useMemo } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartCard } from './ChartCard';
import { CustomTooltip } from './CustomTooltip';

interface TreemapChartProps {
  data: { name: string; value: number }[];
  title: string;
  onDrillDown?: (name: string) => void;
}

export default function TreemapChart({ data, title, onDrillDown }: TreemapChartProps) {
  const chartData = useMemo(() => {
    const total = data.reduce((s, d) => s + d.value, 0);
    return data
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .map(d => ({
        name: d.name,
        size: d.value,
        percent: ((d.value / total) * 100).toFixed(1),
      }));
  }, [data]);

  const CustomContent = useMemo(() => {
    const TreemapContent = (props: any) => {
      const { depth, x, y, width, height, name, percent } = props;
      const colors = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];
      const color = colors[depth % colors.length];
      return (
        <g>
          <rect x={x} y={y} width={width} height={height} fill={color} rx={2} />
          {width > 50 && height > 30 && (
            <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={600}>
              {name}
            </text>
          )}
          {width > 50 && height > 30 && (
            <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#fff" fontSize={10}>
              {percent}%
            </text>
          )}
        </g>
      );
    };
    return TreemapContent;
  }, []);

  if (chartData.length === 0) return null;

  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <Treemap
          data={chartData}
          dataKey="size"
          nameKey="name"
          aspectRatio={4 / 3}
          stroke="#fff"
          onClick={(e: any) => onDrillDown?.(e.name)}
          content={CustomContent as any}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </ChartCard>
  );
}
