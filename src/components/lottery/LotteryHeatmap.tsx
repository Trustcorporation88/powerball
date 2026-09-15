import React, { useState } from 'react';
import { LotteryBall } from './LotteryBall';
import { LotteryStats, LotteryType } from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flame, Clock, Grid3X3, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface LotteryHeatmapProps {
  lottery: LotteryType;
  stats: LotteryStats;
}

export const LotteryHeatmap: React.FC<LotteryHeatmapProps> = ({ lottery, stats }) => {
  const [viewMode, setViewMode] = useState<'heatmap' | 'frequencies' | 'delays'>('heatmap');
  const config = LOTTERY_CONFIGS[lottery];

  // Identifica máximo e mínimo de frequências para o mapa de calor
  const freqValues = Object.values(stats.frequencias);
  const maxFreq = Math.max(...freqValues, 1);
  const minFreq = Math.min(...freqValues, 0);

  // Calcula cor térmica com base na intensidade relativa (0 a 1)
  const getHeatmapColor = (num: number) => {
    const freq = stats.frequencias[num] || 0;
    const ratio = (freq - minFreq) / (maxFreq - minFreq || 1);

    if (ratio > 0.8) return 'bg-rose-600 text-white border-rose-700 shadow-rose-200';
    if (ratio > 0.6) return 'bg-orange-500 text-white border-orange-600';
    if (ratio > 0.4) return 'bg-amber-400 text-amber-950 border-amber-500';
    if (ratio > 0.2) return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    return 'bg-blue-50 text-blue-900 border-blue-200';
  };

  const chartData = Array.from({ length: config.totalNumbers }, (_, i) => {
    const n = i + 1;
    return {
      number: String(n).padStart(2, '0'),
      frequencia: stats.frequencias[n] || 0,
      atraso: stats.atrasos[n] || 0,
    };
  });

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Mapa Térmico & Estatísticas das Dezenas
            </CardTitle>
            <CardDescription>
              Frequência de sorteios e atraso atual baseado em {stats.totalConcursos} concursos
              analisados.
            </CardDescription>
          </div>
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as any)}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="heatmap" className="text-xs">
                <Grid3X3 className="h-3.5 w-3.5 mr-1" />
                Mapa
              </TabsTrigger>
              <TabsTrigger value="frequencies" className="text-xs">
                <BarChart2 className="h-3.5 w-3.5 mr-1" />
                Frequência
              </TabsTrigger>
              <TabsTrigger value="delays" className="text-xs">
                <Clock className="h-3.5 w-3.5 mr-1" />
                Atrasos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === 'heatmap' && (
          <div className="space-y-4">
            <div
              className="grid gap-2 justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800"
              style={{
                gridTemplateColumns: `repeat(${config.colsGrid}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: config.totalNumbers }, (_, i) => {
                const num = i + 1;
                const freq = stats.frequencias[num] || 0;
                const delay = stats.atrasos[num] || 0;
                const heatClass = getHeatmapColor(num);

                return (
                  <div
                    key={num}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all hover:scale-105 cursor-pointer ${heatClass}`}
                    title={`Dezena ${num}: sorteada ${freq} vezes | Atraso: ${delay} concursos`}
                  >
                    <span className="text-sm font-extrabold">{String(num).padStart(2, '0')}</span>
                    <span className="text-[10px] opacity-85 font-medium">{freq}x</span>
                  </div>
                );
              })}
            </div>

            {/* Legenda de calor */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-xs bg-rose-600" />
                <span>Super Quente</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-xs bg-orange-500" />
                <span>Quente</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-xs bg-amber-400" />
                <span>Média</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-xs bg-emerald-100 border border-emerald-300" />
                <span>Moderada</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-xs bg-blue-50 border border-blue-200" />
                <span>Fria</span>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'frequencies' && (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="number" interval={lottery === 'megasena' ? 4 : 1} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) => [`${value} sorteios`, 'Frequência']}
                  labelFormatter={(lbl) => `Dezena ${lbl}`}
                />
                <Bar dataKey="frequencia" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={lottery === 'megasena' ? '#16a34a' : '#9333ea'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {viewMode === 'delays' && (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="number" interval={lottery === 'megasena' ? 4 : 1} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) => [`${value} concursos sem sair`, 'Atraso Atual']}
                  labelFormatter={(lbl) => `Dezena ${lbl}`}
                />
                <Bar dataKey="atraso" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
