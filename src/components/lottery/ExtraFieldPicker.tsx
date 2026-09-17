import React from 'react';
import { Clover, CalendarDays } from 'lucide-react';

import { LotteryExtraSelection, LotteryStats, LotteryType } from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';
import { Badge } from '@/components/ui/badge';

interface ExtraFieldPickerProps {
  lottery: LotteryType;
  value?: LotteryExtraSelection;
  onChange: (selection: LotteryExtraSelection | undefined) => void;
  stats?: LotteryStats | null;
}

/**
 * Campo extra do volante: Mês da Sorte (Dia de Sorte) e Trevos (+Milionária).
 *
 * Fica oculto nas modalidades que não têm campo extra. A frequência histórica
 * aparece ao lado de cada opção porque é a mesma leitura que o gerador usa
 * quando o usuário não fixa nada.
 */
export const ExtraFieldPicker: React.FC<ExtraFieldPickerProps> = ({
  lottery,
  value,
  onChange,
  stats,
}) => {
  const field = LOTTERY_CONFIGS[lottery].extraField;
  if (!field) return null;

  const frequencias = stats?.extraFrequencias ?? {};
  const maiorFrequencia = Math.max(1, ...Object.values(frequencias));

  const ehTrevo = field.key === 'trevos';
  const selecionados = ehTrevo
    ? (value?.trevos ?? []).map(String)
    : value?.mesSorte
      ? [value.mesSorte]
      : [];

  const alternar = (opcao: string) => {
    if (!ehTrevo) {
      onChange(value?.mesSorte === opcao ? undefined : { mesSorte: opcao });
      return;
    }

    const atual = new Set(value?.trevos ?? []);
    const numero = Number(opcao);

    if (atual.has(numero)) {
      atual.delete(numero);
    } else {
      if (atual.size >= field.maxSelection) return;
      atual.add(numero);
    }

    const lista = Array.from(atual).sort((a, b) => a - b);
    onChange(lista.length > 0 ? { trevos: lista } : undefined);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          {ehTrevo ? <Clover className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
          {field.label}
        </label>
        <span className="text-[11px] text-muted-foreground">
          {ehTrevo
            ? `${selecionados.length}/${field.maxSelection} (mínimo ${field.minSelection})`
            : 'opcional — o gerador escolhe se você não marcar'}
        </span>
      </div>

      <div className={`grid gap-1.5 ${ehTrevo ? 'grid-cols-6' : 'grid-cols-3 sm:grid-cols-4'}`}>
        {field.options.map((opcao) => {
          const ativo = selecionados.includes(opcao);
          const frequencia = frequencias[opcao] ?? 0;
          const intensidade = frequencia / maiorFrequencia;

          return (
            <button
              key={opcao}
              type="button"
              onClick={() => alternar(opcao)}
              title={frequencia > 0 ? `Sorteado ${frequencia}x no histórico` : undefined}
              className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition-all ${
                ativo
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
              }`}
              style={
                ativo
                  ? { backgroundColor: LOTTERY_CONFIGS[lottery].color }
                  : intensidade > 0
                    ? { backgroundColor: `rgba(234, 88, 12, ${0.06 + intensidade * 0.18})` }
                    : undefined
              }
            >
              {ehTrevo ? opcao : opcao.slice(0, 3)}
            </button>
          );
        })}
      </div>

      {selecionados.length > 0 && (
        <Badge variant="outline" className="text-[11px] font-medium">
          {ehTrevo ? `Trevos ${selecionados.join(' e ')}` : selecionados[0]}
        </Badge>
      )}
    </div>
  );
};
