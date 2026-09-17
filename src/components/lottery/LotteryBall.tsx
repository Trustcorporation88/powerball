import React from 'react';
import { cn } from '@/lib/utils';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';
import { LotteryType } from '@/types/lottery';

interface LotteryBallProps {
  number: number;
  lottery?: LotteryType;
  selected?: boolean;
  isHit?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
  subtext?: string;
}

export const LotteryBall: React.FC<LotteryBallProps> = ({
  number,
  lottery = 'lotofacil',
  selected = false,
  isHit = false,
  size = 'md',
  onClick,
  disabled = false,
  badge,
  subtext,
}) => {
  const formattedNumber = String(number).padStart(2, '0');

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs font-semibold',
    md: 'w-9 h-9 text-sm font-bold',
    lg: 'w-11 h-11 text-base font-extrabold',
  }[size];

  // Cores dinâmicas oficiais Caixa. A cor de seleção vem da configuração da
  // modalidade para que as seis loterias mantenham a identidade visual própria.
  let bgClasses =
    'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400';
  let bgStyle: React.CSSProperties | undefined;

  if (isHit) {
    bgClasses = 'bg-amber-400 text-amber-950 border-2 border-amber-500 shadow-md scale-105 animate-pulse';
  } else if (selected) {
    bgClasses = 'text-white border-2 shadow-md scale-105';
    const cor = LOTTERY_CONFIGS[lottery]?.color ?? '#9333ea';
    bgStyle = { backgroundColor: cor, borderColor: cor };
  }

  return (
    <div className="relative inline-flex flex-col items-center">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={bgStyle}
        className={cn(
          'rounded-full flex items-center justify-center transition-all duration-200 select-none shadow-sm cursor-pointer',
          sizeClasses,
          bgClasses,
          disabled && 'opacity-50 cursor-not-allowed hover:border-slate-300'
        )}
      >
        {formattedNumber}
      </button>
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-red-600 text-white px-1 rounded-full font-bold">
          {badge}
        </span>
      )}
      {subtext && (
        <span className="text-[10px] text-muted-foreground mt-0.5 tracking-tight font-medium">
          {subtext}
        </span>
      )}
    </div>
  );
};
