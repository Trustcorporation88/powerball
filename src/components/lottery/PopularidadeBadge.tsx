import React from 'react';
import { Popularidade } from '@/types/lottery';
import { ROTULO_POPULARIDADE } from '@/services/lotteryPopularidade';

const CORES: Record<Popularidade['nivel'], string> = {
  baixa: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  media: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  alta: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

/** Selo de quantas pessoas tendem a marcar a mesma combinação. */
export const PopularidadeBadge: React.FC<{ popularidade?: Popularidade }> = ({ popularidade }) => {
  if (!popularidade) return null;

  const dica =
    popularidade.motivos.length > 0
      ? `${popularidade.motivos.join('; ')}. Não muda a chance, só quantos dividiriam o prêmio.`
      : 'Combinação fora dos padrões que a maioria marca. Não muda a chance, só quantos dividiriam o prêmio.';

  return (
    <span
      title={dica}
      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${CORES[popularidade.nivel]}`}
    >
      {ROTULO_POPULARIDADE[popularidade.nivel]}
    </span>
  );
};
