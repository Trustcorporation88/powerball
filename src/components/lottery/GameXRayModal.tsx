import React from 'react';
import { GameAnalysis } from '@/types/lottery';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';

interface GameXRayModalProps {
  analysis: GameAnalysis;
  score: number;
  scoreLabel: string;
  numbers: number[];
}

export const GameXRayModal: React.FC<GameXRayModalProps> = ({
  analysis,
  score,
  scoreLabel,
  numbers,
}) => {
  const { scoreBreakdown } = analysis;

  const scoreColor =
    score >= 88
      ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200'
      : score >= 75
      ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 border-blue-200'
      : score >= 60
      ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 border-amber-200'
      : 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 border-rose-200';

  return (
    <div className="space-y-4 text-sm">
      {/* Score Header */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${scoreColor}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-white dark:bg-slate-900 shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold opacity-75">
              Score de Eficiência Estatística
            </p>
            <h3 className="text-xl font-bold flex items-center gap-2">
              {score} / 100 pontos
              <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 font-semibold shadow-xs">
                {scoreLabel}
              </span>
            </h3>
          </div>
        </div>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="shadow-none border-slate-200 dark:border-slate-800">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Pares / Ímpares</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {analysis.evenCount}P / {analysis.oddCount}I
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-none border-slate-200 dark:border-slate-800">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Soma das Dezenas</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {analysis.sum}
            </p>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                analysis.sumStatus === 'ideal'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {analysis.sumStatus === 'ideal' ? 'Faixa Ideal' : analysis.sumStatus}
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-none border-slate-200 dark:border-slate-800">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Números Primos</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {analysis.primeCount}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-none border-slate-200 dark:border-slate-800">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">
              {analysis.frameHits !== undefined ? 'Moldura / Miolo' : 'Maior Sequência'}
            </p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {analysis.frameHits !== undefined
                ? `${analysis.frameHits}M / ${analysis.centerHits}C`
                : `${analysis.maxConsecutiveRun} seguidos`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Decomposição do Score */}
      <div className="space-y-2.5 pt-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pilares de Avaliação
        </h4>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Paridade e Equilíbrio (P/I)</span>
            <span className="font-semibold">{scoreBreakdown.parityScore} / 25 pts</span>
          </div>
          <Progress value={(scoreBreakdown.parityScore / 25) * 100} className="h-1.5" />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Curva de Gauss (Soma)</span>
            <span className="font-semibold">{scoreBreakdown.sumScore} / 25 pts</span>
          </div>
          <Progress value={(scoreBreakdown.sumScore / 25) * 100} className="h-1.5" />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Espalhamento no Volante</span>
            <span className="font-semibold">{scoreBreakdown.spreadScore} / 20 pts</span>
          </div>
          <Progress value={(scoreBreakdown.spreadScore / 20) * 100} className="h-1.5" />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Sequências Consecutivas</span>
            <span className="font-semibold">{scoreBreakdown.consecutivePenalty} / 15 pts</span>
          </div>
          <Progress value={(scoreBreakdown.consecutivePenalty / 15) * 100} className="h-1.5" />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>
              {scoreBreakdown.frameScore !== undefined ? 'Moldura vs Miolo' : 'Primos & Frequência'}
            </span>
            <span className="font-semibold">{scoreBreakdown.frequencyScore} / 15 pts</span>
          </div>
          <Progress value={(scoreBreakdown.frequencyScore / 15) * 100} className="h-1.5" />
        </div>
      </div>

      {/* Recomendações e Diagnóstico */}
      <div className="pt-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Diagnóstico do Jogo
        </h4>
        <div className="space-y-1.5">
          {analysis.recommendations.map((rec, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300"
            >
              {score >= 75 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
