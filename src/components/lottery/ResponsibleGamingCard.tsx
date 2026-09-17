import React, { useMemo, useState } from 'react';
import { HeartHandshake, ShieldAlert } from 'lucide-react';

import { LotteryType, UserSavedGame } from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';
import {
  calcularGastoMensal,
  compararChance,
  custoAnualProjetado,
  formatarChance,
  getResponsibleSettings,
  saveResponsibleSettings,
} from '@/services/lotteryResponsible';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface ResponsibleGamingCardProps {
  lottery: LotteryType;
  savedGames: UserSavedGame[];
}

/**
 * Controle de gasto e leitura honesta das probabilidades.
 *
 * É o contrapeso do resto do site: por mais elaborada que seja a análise, a
 * chance de cada aposta continua fixa. O que dá para administrar é o bolso.
 */
export const ResponsibleGamingCard: React.FC<ResponsibleGamingCardProps> = ({
  lottery,
  savedGames,
}) => {
  const config = LOTTERY_CONFIGS[lottery];
  const [settings, setSettings] = useState(() => getResponsibleSettings());
  const [rascunhoLimite, setRascunhoLimite] = useState(() => String(getResponsibleSettings().limiteMensal));

  const resumo = useMemo(() => calcularGastoMensal(savedGames), [savedGames, settings]);

  const custoAnual = custoAnualProjetado(lottery, config.basePrice);

  const salvarLimite = () => {
    const valor = Math.max(0, Number(rascunhoLimite) || 0);
    setSettings(saveResponsibleSettings({ limiteMensal: valor }));
  };

  const corBarra = resumo.excedido
    ? 'text-red-600'
    : resumo.emAlerta
      ? 'text-amber-600'
      : 'text-emerald-600';

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HeartHandshake className="h-5 w-5 text-rose-600" />
          Jogo Responsável
        </CardTitle>
        <CardDescription>
          Defina um teto mensal e o site avisa antes de você passar dele. Só entram na conta os
          bilhetes marcados como apostados — gerar palpite não custa nada.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Limite de gasto mensal (R$) — 0 desativa
            </label>
            <Input
              type="number"
              min={0}
              step={10}
              value={rascunhoLimite}
              onChange={(e) => setRascunhoLimite(e.target.value)}
              placeholder="Ex.: 100"
            />
          </div>
          <Button onClick={salvarLimite} variant="outline" className="font-semibold">
            Salvar limite
          </Button>
        </div>

        {resumo.limiteMensal > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Apostado neste mês em {resumo.jogosApostados} bilhete(s)
              </span>
              <span className={`font-bold tabular-nums ${corBarra}`}>
                R$ {resumo.totalApostado.toFixed(2)} de R$ {resumo.limiteMensal.toFixed(2)}
              </span>
            </div>
            <Progress value={Math.min(100, resumo.percentualUsado)} className="h-2" />
            {resumo.excedido && (
              <p className="text-sm text-red-600 flex items-start gap-1.5">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                Você passou do limite que definiu para este mês em R${' '}
                {(resumo.totalApostado - resumo.limiteMensal).toFixed(2)}.
              </p>
            )}
          </div>
        )}

        <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-sm">
          <p className="font-semibold">A chance real de {config.name}</p>
          <p className="text-slate-700 dark:text-slate-300">
            A faixa principal sai em <strong>{formatarChance(lottery)}</strong> apostas.{' '}
            {compararChance(lottery)}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            Jogando a aposta mínima de R$ {config.basePrice.toFixed(2)} em todos os{' '}
            {config.drawDays.length} concursos semanais, o gasto chega a{' '}
            <strong>R$ {custoAnual.toFixed(2)} por ano</strong>.
          </p>
          <p className="text-xs text-muted-foreground pt-1">
            Cada sorteio é independente: nenhuma estatística deste site altera a probabilidade do
            próximo resultado. Apostas são para maiores de 18 anos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
